import { NextResponse, type NextRequest } from 'next/server'
import { BUDGET_LABEL } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Category, Trip } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CATS: Category[] = ['sight', 'food', 'cafe', 'activity']

// Gemini 응답을 JSON 형식으로 고정
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    places: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: '한국어 장소 이름' },
          name_local: { type: 'STRING', description: '현지어 또는 영문 공식 이름 (지도 검색용)' },
          category: { type: 'STRING', format: 'enum', enum: CATS },
          area: { type: 'STRING', description: '동네·지역 이름 (한국어)' },
          reason: { type: 'STRING', description: '이 여행 조건에 맞는 추천 이유 한두 문장 (한국어)' },
          lat: { type: 'NUMBER' },
          lon: { type: 'NUMBER' },
        },
        required: ['name', 'name_local', 'category', 'area', 'reason', 'lat', 'lon'],
      },
    },
  },
  required: ['places'],
}

function buildPrompt(trip: Trip, count: number, exclude: string[]) {
  return [
    `당신은 자유여행 코디네이터입니다. 아래 조건으로 ${trip.destination}${trip.country ? `(${trip.country})` : ''} 여행 후보 장소 ${count}곳을 추천하세요.`,
    `- 여행 일수: ${trip.days}일`,
    `- 예산: ${BUDGET_LABEL[trip.budget]}`,
    `- 여행 스타일: ${trip.style_tags.join(', ')}`,
    `- 분류(category)는 sight(명소), food(맛집), cafe(카페), activity(체험) 중 하나. 스타일에 맞춰 비중을 정하되 네 분류가 모두 나오게 하세요.`,
    `- 실제로 존재하고 현재 영업 중일 가능성이 높은 곳만. 광고성 체인점보다 현지에서 평판이 좋은 곳 위주.`,
    `- ${trip.days}일 동안 동선을 묶기 좋도록 여러 지역(area)에 고르게 나누세요.`,
    `- reason은 왜 이 일행의 스타일·예산에 맞는지 한두 문장. 과장 없이 구체적으로.`,
    `- lat/lon은 실제 위치의 대략적인 좌표.`,
    exclude.length ? `- 이미 후보에 있는 곳은 빼세요: ${exclude.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았어요.' }, { status: 500 })

  const { tripId } = await req.json().catch(() => ({}))
  if (typeof tripId !== 'string') return NextResponse.json({ error: 'tripId가 필요해요' }, { status: 400 })

  const sb = createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  const { data: trip } = await sb.from('trips').select('*').eq('id', tripId).maybeSingle<Trip>()
  if (!trip) return NextResponse.json({ error: '방을 찾을 수 없어요' }, { status: 404 })
  if (trip.owner_id !== auth.user.id) return NextResponse.json({ error: '추천 요청은 방장만 할 수 있어요' }, { status: 403 })

  const { data: existing } = await sb.from('places').select('name, name_local').eq('trip_id', tripId)
  const taken = new Set<string>()
  for (const p of existing ?? []) {
    taken.add(norm(p.name))
    if (p.name_local) taken.add(norm(p.name_local))
  }
  const count = taken.size === 0 ? 18 : 8

  // 개인정보(이메일·닉네임)는 보내지 않고 여행 조건만 보낸다.
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(trip, count, (existing ?? []).map((p) => p.name)) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.8 },
      }),
    })
  } catch {
    return NextResponse.json({ error: 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 })
  }
  if (res.status === 429)
    return NextResponse.json({ error: '추천 요청이 많아요. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
  if (!res.ok) return NextResponse.json({ error: 'AI 추천에 실패했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 })

  let list: any[] = []
  try {
    const j = await res.json()
    const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
    list = JSON.parse(text).places ?? []
  } catch {
    return NextResponse.json({ error: 'AI 응답을 읽지 못했어요. 다시 시도해 주세요.' }, { status: 502 })
  }

  const near = (lat: unknown, lon: unknown) =>
    typeof lat === 'number' && typeof lon === 'number' && Math.abs(lat - trip.lat) < 5 && Math.abs(lon - trip.lon) < 5

  const rows = []
  for (const p of list) {
    const name = String(p?.name ?? '').trim().slice(0, 80)
    if (!name || !CATS.includes(p.category)) continue
    const local = String(p.name_local ?? '').trim().slice(0, 120) || null
    if (taken.has(norm(name)) || (local && taken.has(norm(local)))) continue
    taken.add(norm(name))
    if (local) taken.add(norm(local))
    const ok = near(p.lat, p.lon)
    rows.push({
      trip_id: trip.id,
      name,
      name_local: local,
      category: p.category as Category,
      area: String(p.area ?? '').trim().slice(0, 60) || null,
      reason: String(p.reason ?? '').trim().slice(0, 400) || null,
      source: 'ai' as const,
      added_by: auth.user.id,
      lat: ok ? p.lat : null,
      lon: ok ? p.lon : null,
      geo_verified: null,
    })
  }
  if (rows.length === 0) return NextResponse.json({ error: '새 후보를 찾지 못했어요. 다시 시도해 주세요.' }, { status: 502 })

  const { error } = await sb.from('places').insert(rows)
  if (error) return NextResponse.json({ error: '후보 저장에 실패했어요. 다시 시도해 주세요.' }, { status: 500 })
  return NextResponse.json({ added: rows.length })
}
