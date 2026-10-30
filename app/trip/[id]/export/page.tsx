'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import Mascot from '@/components/Mascot'
import TripGate from '@/components/TripGate'
import { CATEGORIES, voteCounts } from '@/lib/constants'
import { useTrip } from '@/lib/useTrip'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => <div className="leaflet-box" />,
})

export default function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const { phase, trip, members, places } = useTrip(id)
  const [downloaded, setDownloaded] = useState(false)
  const confirmed = useMemo(() => places.filter((p) => p.status === 'confirmed'), [places])
  const nick = useMemo(() => new Map(members.map((m) => [m.user_id, m.nickname])), [members])

  if (phase !== 'ready' || !trip) return <TripGate phase={phase} next={`/trip/${id}/export`} />

  const noCoord = confirmed.filter((p) => p.lat == null || p.lon == null)
  const unsure = confirmed.filter((p) => p.geo_verified === false && p.lat != null)
  const href = (f: 'kml' | 'csv') => `/api/export?tripId=${id}&format=${f}`

  return (
    <div className="stack-lg">
      <section className="board-head">
        <div className="stack-sm">
          <Link href={`/trip/${id}`} className="muted small">← 후보 보드로</Link>
          <h1>
            {trip.destination} 확정 목록 <span className="muted">{confirmed.length}곳</span>
          </h1>
        </div>
      </section>

      {confirmed.length === 0 ? (
        <Mascot mood="trouble" text="아직 확정한 장소가 없어요. 방장이 후보 보드에서 ‘확정’을 눌러 주세요." />
      ) : (
        <Mascot
          mood="celebrate"
          text={downloaded ? '내려받았어요! 아래 3단계로 구글 ‘내 지도’에 올려 보세요.' : `같이 고른 ${confirmed.length}곳이에요. 지도로 옮겨 볼까요?`}
        />
      )}

      <div className="board-grid">
        <div className="stack">
          <LeafletMap places={confirmed} center={{ lat: trip.lat, lon: trip.lon }} />
          {(noCoord.length > 0 || unsure.length > 0) && (
            <p className="muted small">
              {noCoord.length > 0 && `좌표가 없는 ${noCoord.length}곳은 KML에서 빠지고 CSV에만 들어가요. `}
              {unsure.length > 0 && `점선 핀 ${unsure.length}곳은 AI가 추정한 위치라 확인이 필요해요.`}
            </p>
          )}
          {CATEGORIES.map((c) => {
            const list = confirmed.filter((p) => p.category === c.k)
            if (list.length === 0) return null
            return (
              <section key={c.k} className="stack-sm">
                <h3 className="section-title" style={{ ['--c' as any]: c.color }}>
                  <span className="dot" /> {c.label} {list.length}
                </h3>
                <ul className="confirmed">
                  {list.map((p) => {
                    const { up } = voteCounts(p.opinions)
                    return (
                      <li key={p.id}>
                        <b>{p.name}</b>
                        <span className="muted small">
                          {p.area ? `${p.area} · ` : ''}👍 {up}
                          {p.source === 'user' ? ` · ${nick.get(p.added_by ?? '') ?? '동행'} 추가` : ''}
                          {p.geo_verified === false ? ' · 위치 확인 필요' : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <aside className="stack">
          <section className="panel stack">
            <h3 className="section-title">내려받기</h3>
            <a
              className={`btn primary lg${confirmed.length === 0 ? ' disabled' : ''}`}
              href={href('kml')}
              download
              aria-disabled={confirmed.length === 0}
              onClick={() => setDownloaded(true)}
            >
              KML 파일 (구글 내 지도용)
            </a>
            <a className={`btn ghost${confirmed.length === 0 ? ' disabled' : ''}`} href={href('csv')} download aria-disabled={confirmed.length === 0}>
              CSV 파일 (엑셀·스프레드시트)
            </a>
            <p className="muted small">분류(명소·맛집·카페·체험)별 폴더로 묶이고, 추천 이유와 코멘트 요약이 핀 설명에 들어가요.</p>
          </section>

          <section className="panel stack">
            <h3 className="section-title">구글 ‘내 지도’로 가져오기</h3>
            <ol className="steps">
              <li>
                <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener noreferrer">
                  google.com/maps/d
                </a>
                에서 <b>새 지도 만들기</b>를 누릅니다.
              </li>
              <li>왼쪽 패널의 ‘제목 없는 레이어’ 아래 <b>가져오기</b>를 누릅니다.</li>
              <li>
                내려받은 <b>KML 파일</b>을 끌어다 놓으면 핀이 찍혀요. 휴대폰 구글 맵 앱의 <b>저장됨 → 지도</b>에서도 볼 수 있어요.
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
