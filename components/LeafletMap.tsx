'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { CAT } from '@/lib/constants'
import type { Place } from '@/lib/types'

// 확정 장소를 분류별 색 핀으로 보여주는 미리보기 지도 (Leaflet + OpenStreetMap 타일)
export default function LeafletMap({ places, center }: { places: Place[]; center: { lat: number; lon: number } }) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: any
    let cancelled = false
    import('leaflet').then(({ default: L }) => {
      if (cancelled || !el.current) return
      map = L.map(el.current, { scrollWheelZoom: false }).setView([center.lat, center.lon], 10)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
      }).addTo(map)
      const pts: [number, number][] = []
      for (const p of places) {
        if (p.lat == null || p.lon == null) continue
        pts.push([p.lat, p.lon])
        const color = CAT[p.category].color
        L.circleMarker([p.lat, p.lon], {
          radius: 9,
          color: '#fff',
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
          dashArray: p.geo_verified === false ? '3 3' : undefined,
        })
          .bindTooltip(`${p.name} · ${CAT[p.category].label}${p.geo_verified === false ? ' (위치 확인 필요)' : ''}`)
          .addTo(map)
      }
      if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 })
      else if (pts.length === 1) map.setView(pts[0], 14)
    })
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [places, center.lat, center.lon])

  return <div ref={el} className="leaflet-box" aria-label="확정 장소 지도" />
}
