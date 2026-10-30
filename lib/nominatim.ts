import type { GeoHit } from './types'

// OpenStreetMap Nominatim: 초당 1회 제한이 있어 서버에서 순차 호출한다.
const UA = 'TripTogetherMVP/0.1 (travel picking class project)'
let lastCall = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function searchPlaces(
  q: string,
  opts: { near?: { lat: number; lon: number }; limit?: number } = {},
): Promise<GeoHit[]> {
  const wait = lastCall + 1100 - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()

  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('q', q)
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('limit', String(opts.limit ?? 1))
  u.searchParams.set('addressdetails', '1')
  u.searchParams.set('accept-language', 'ko,en')
  if (opts.near) {
    const d = 2
    const { lat, lon } = opts.near
    u.searchParams.set('viewbox', `${lon - d},${lat + d},${lon + d},${lat - d}`)
    u.searchParams.set('bounded', '1')
  }
  if (process.env.NOMINATIM_EMAIL) u.searchParams.set('email', process.env.NOMINATIM_EMAIL)

  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA }, cache: 'no-store' })
    if (!res.ok) return []
    const arr = (await res.json()) as any[]
    return arr.map((r) => {
      const a = r.address ?? {}
      return {
        name: r.name || String(r.display_name).split(',')[0],
        display: r.display_name,
        lat: Number(r.lat),
        lon: Number(r.lon),
        country: a.country ?? '',
        area: a.suburb || a.city_district || a.town || a.city || a.village || a.county || a.state || '',
      }
    })
  } catch {
    return []
  }
}
