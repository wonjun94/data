import { NextResponse, type NextRequest } from 'next/server'
import { CAT, CATEGORIES, voteCounts } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { PlaceWithOpinions, Trip } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /api/export?tripId=..&format=kml|csv
// 확정된 장소를 파일로 만든다. 저장하지 않고 요청할 때마다 생성한다.
export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get('tripId')
  const format = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'kml'
  if (!tripId) return NextResponse.json({ error: 'tripId가 필요해요' }, { status: 400 })

  const sb = createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })

  // RLS: 승인된 멤버가 아니면 아무것도 읽히지 않는다
  const { data: trip } = await sb.from('trips').select('*').eq('id', tripId).maybeSingle<Trip>()
  if (!trip) return NextResponse.json({ error: '방을 찾을 수 없어요' }, { status: 404 })
  const [{ data: placeRows }, { data: memberRows }] = await Promise.all([
    sb.from('places').select('*, opinions(*)').eq('trip_id', tripId).eq('status', 'confirmed').order('created_at'),
    sb.from('members').select('user_id, nickname').eq('trip_id', tripId),
  ])
  const places = (placeRows ?? []) as PlaceWithOpinions[]
  const nick = new Map((memberRows ?? []).map((m) => [m.user_id, m.nickname]))

  const commentsOf = (p: PlaceWithOpinions, max: number) =>
    p.opinions
      .filter((o) => o.comment)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, max)
      .map((o) => `${nick.get(o.user_id) ?? '동행'}: ${o.comment}`)

  const base = `${trip.destination}-${trip.days}일-확정목록`

  if (format === 'csv') {
    const cell = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [['이름', '위도', '경도', '분류', '메모'].join(',')]
    for (const p of places) {
      const memo = [p.reason, ...commentsOf(p, 5), p.geo_verified === false ? '위치 확인 필요' : '', p.link]
        .filter(Boolean)
        .join(' / ')
      lines.push([p.name, p.lat ?? '', p.lon ?? '', CAT[p.category].label, memo].map(cell).join(','))
    }
    return file('﻿' + lines.join('\r\n'), `${base}.csv`, 'text/csv; charset=utf-8')
  }

  const x = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)
  const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
  const kmlColor = (hex: string) => `ff${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}`.toLowerCase()

  const styles = CATEGORIES.map(
    (c) =>
      `<Style id="cat-${c.k}"><IconStyle><color>${kmlColor(c.color)}</color><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle></Style>`,
  ).join('\n')

  const folders = CATEGORIES.map((c) => {
    const items = places.filter((p) => p.category === c.k && p.lat != null && p.lon != null)
    if (items.length === 0) return ''
    const marks = items
      .map((p) => {
        const { up, down } = voteCounts(p.opinions)
        const desc = [
          p.reason ?? '',
          `좋아요 ${up} · 별로 ${down}`,
          ...commentsOf(p, 3),
          p.geo_verified === false ? '※ 위치 확인 필요 (AI 추정 좌표)' : '',
          p.link ?? '',
          p.source === 'ai' ? 'AI 추천' : `${nick.get(p.added_by ?? '') ?? '동행'} 추가`,
        ]
          .filter(Boolean)
          .join('\n')
        return `<Placemark><name>${x(p.name)}</name><styleUrl>#cat-${c.k}</styleUrl><description>${cdata(desc)}</description><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>`
      })
      .join('\n')
    return `<Folder><name>${x(c.label)}</name>\n${marks}\n</Folder>`
  })
    .filter(Boolean)
    .join('\n')

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${x(`${trip.destination} ${trip.days}일 · 같이 고른 장소`)}</name>
${styles}
${folders}
</Document>
</kml>
`
  return file(kml, `${base}.kml`, 'application/vnd.google-earth.kml+xml; charset=utf-8')
}

function file(body: string, name: string, type: string) {
  return new Response(body, {
    headers: {
      'content-type': type,
      'content-disposition': `attachment; filename="export.${name.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'no-store',
    },
  })
}
