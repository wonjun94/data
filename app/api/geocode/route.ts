import { NextResponse, type NextRequest } from 'next/server'
import { searchPlaces } from '@/lib/nominatim'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/geocode?q=오키나와            → 지구본 도시 검색 (최대 5개)
// GET /api/geocode?q=이름&lat=..&lon=..  → 목적지 주변에서 장소 1곳 찾기 (직접 추가용)
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim().slice(0, 120)
  if (!q) return NextResponse.json({ results: [] })
  const lat = Number(sp.get('lat'))
  const lon = Number(sp.get('lon'))
  const near = sp.has('lat') && Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined
  const results = await searchPlaces(q, { near, limit: near ? 1 : 5 })
  return NextResponse.json({ results })
}

// POST /api/geocode { tripId } → 방장이 AI 후보의 좌표를 OpenStreetMap으로 다시 맞춘다.
// 초당 1회 제한 때문에 한 번에 몇 곳씩만 처리하고, 남은 개수를 알려준다.
const BATCH = 8

export async function POST(req: NextRequest) {
  const { tripId } = await req.json().catch(() => ({}))
  if (typeof tripId !== 'string') return NextResponse.json({ error: 'tripId가 필요해요' }, { status: 400 })

  const sb = createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  const { data: trip } = await sb.from('trips').select('id, owner_id, lat, lon').eq('id', tripId).maybeSingle()
  if (!trip) return NextResponse.json({ error: '방을 찾을 수 없어요' }, { status: 404 })
  if (trip.owner_id !== auth.user.id) return NextResponse.json({ error: '방장만 할 수 있어요' }, { status: 403 })

  const { data: todo } = await sb
    .from('places')
    .select('id, name, name_local, lat, lon')
    .eq('trip_id', tripId)
    .is('geo_verified', null)
    .order('created_at')
    .limit(BATCH)

  const near = { lat: trip.lat, lon: trip.lon }
  let verified = 0
  for (const p of todo ?? []) {
    let hit = p.name_local ? (await searchPlaces(p.name_local, { near }))[0] : undefined
    if (!hit) hit = (await searchPlaces(p.name, { near }))[0]
    const patch = hit ? { lat: hit.lat, lon: hit.lon, geo_verified: true } : { geo_verified: false }
    if (hit) verified++
    await sb.from('places').update(patch).eq('id', p.id)
  }

  const { count } = await sb
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .is('geo_verified', null)

  return NextResponse.json({ checked: todo?.length ?? 0, verified, remaining: count ?? 0 })
}
