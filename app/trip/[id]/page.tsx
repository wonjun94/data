'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import AddPlaceForm from '@/components/AddPlaceForm'
import MembersPanel from '@/components/MembersPanel'
import Mascot, { type Mood } from '@/components/Mascot'
import PlaceCard from '@/components/PlaceCard'
import TripGate from '@/components/TripGate'
import { BUDGET_LABEL, CATEGORIES, voteCounts } from '@/lib/constants'
import type { Category } from '@/lib/types'
import { useTrip } from '@/lib/useTrip'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const { phase, me, trip, members, places, reload } = useTrip(id)
  const [filter, setFilter] = useState<'all' | Category>('all')
  const [sort, setSort] = useState<'likes' | 'new'>('likes')
  const [showExcluded, setShowExcluded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ mood: Mood; text: string } | null>(null)
  const autoStarted = useRef(false)
  const geoStarted = useRef(false)

  const isOwner = !!trip && trip.owner_id === me
  const nick = useMemo(() => new Map(members.map((m) => [m.user_id, m.nickname])), [members])

  async function verifyLocations() {
    // 위치 확인 전인 AI 후보를 몇 곳씩 OpenStreetMap으로 확인 (초당 1회 제한)
    for (let i = 0; i < 8; i++) {
      const r = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tripId: id }),
      }).catch(() => null)
      const j = r ? await r.json().catch(() => ({})) : {}
      await reload()
      if (!r?.ok || !j.remaining || !j.checked) break
    }
  }

  async function recommend() {
    if (!trip || busy) return
    geoStarted.current = true // 좌표 확인은 아래에서 직접 이어서 한다
    setBusy(true)
    setNote({ mood: 'searching', text: `${trip.destination} 후보를 찾고 있어요…` })
    const r = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tripId: id }),
    }).catch(() => null)
    const j = r ? await r.json().catch(() => ({})) : {}
    setBusy(false)
    if (!r?.ok) {
      setNote({ mood: 'trouble', text: j.error || '잠시 후 다시 시도해 주세요.' })
      return
    }
    setNote({ mood: 'celebrate', text: `${trip.destination} 후보 ${j.added}곳을 찾았어요! 좌표를 확인하는 중이에요.` })
    await reload()
    await verifyLocations()
    setNote({ mood: 'celebrate', text: `${trip.destination} 후보 ${j.added}곳을 찾았어요! 동행에게 초대 링크를 보내 보세요.` })
  }

  // 방을 막 만든 경우 자동으로 첫 추천을 받는다
  useEffect(() => {
    if (phase !== 'ready' || !isOwner || autoStarted.current) return
    const isNew = new URLSearchParams(window.location.search).get('new') === '1'
    if (isNew) window.history.replaceState(null, '', `/trip/${id}`)
    if (isNew && places.length === 0) {
      autoStarted.current = true
      recommend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isOwner])

  // 중간에 끊겨 좌표 확인이 남은 후보가 있으면 이어서 확인
  useEffect(() => {
    if (phase !== 'ready' || !isOwner || geoStarted.current || busy) return
    if (places.some((p) => p.geo_verified === null)) {
      geoStarted.current = true
      verifyLocations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isOwner, places.length])

  if (phase !== 'ready' || !trip || !me) return <TripGate phase={phase} next={`/trip/${id}`} />

  const active = places.filter((p) => p.status !== 'excluded')
  const excluded = places.filter((p) => p.status === 'excluded')
  const confirmedCount = places.filter((p) => p.status === 'confirmed').length
  const byCat = (list: typeof places) => (filter === 'all' ? list : list.filter((p) => p.category === filter))
  const sorted = [...byCat(active)].sort((a, b) => {
    if (sort === 'new') return b.created_at.localeCompare(a.created_at)
    const va = voteCounts(a.opinions)
    const vb = voteCounts(b.opinions)
    return vb.up - va.up || va.down - vb.down || a.created_at.localeCompare(b.created_at)
  })

  const mascot =
    note ??
    (places.length === 0
      ? { mood: 'welcome' as Mood, text: isOwner ? 'AI 후보 추천을 받아 볼까요?' : '방장이 후보를 준비하고 있어요.' }
      : { mood: 'welcome' as Mood, text: `후보 ${active.length}곳 · 확정 ${confirmedCount}곳. 마음에 드는 곳에 좋아요를 눌러 주세요!` })

  return (
    <div className="stack-lg">
      <section className="board-head">
        <div className="stack-sm">
          <Link href="/" className="muted small">← 지구본으로</Link>
          <h1>
            {trip.destination} <span className="muted">{trip.days}일</span>
          </h1>
          <div className="tags">
            {trip.country && <span className="tag">{trip.country}</span>}
            <span className="tag">{BUDGET_LABEL[trip.budget]}</span>
            {trip.style_tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>
        <Link href={`/trip/${id}/export`} className="btn primary">
          확정 목록·내보내기 ({confirmedCount})
        </Link>
      </section>

      <Mascot mood={mascot.mood} text={mascot.text} />

      <div className="board-grid">
        <div className="stack">
          <div className="toolbar">
            <div className="chips">
              <button type="button" className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                전체 <span className="n">{active.length}</span>
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.k}
                  type="button"
                  className="chip"
                  style={{ ['--c' as any]: c.color }}
                  aria-pressed={filter === c.k}
                  onClick={() => setFilter(c.k)}
                >
                  <span className="dot" />
                  {c.label} <span className="n">{active.filter((p) => p.category === c.k).length}</span>
                </button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as 'likes' | 'new')} aria-label="정렬">
              <option value="likes">좋아요 많은 순</option>
              <option value="new">최근 추가 순</option>
            </select>
          </div>

          {places.length === 0 && isOwner && (
            <button type="button" className="btn primary lg" onClick={recommend} disabled={busy}>
              {busy ? '찾는 중…' : 'AI 후보 추천받기'}
            </button>
          )}

          <div className="cards">
            {sorted.map((p) => (
              <PlaceCard key={p.id} place={p} me={me} isOwner={isOwner} destination={trip.destination} nick={nick} onChanged={reload} />
            ))}
          </div>

          {excluded.length > 0 && (
            <div className="stack">
              <button type="button" className="btn ghost" onClick={() => setShowExcluded((s) => !s)}>
                {showExcluded ? '제외된 후보 숨기기' : `제외된 후보 ${excluded.length}곳 보기`}
              </button>
              {showExcluded && (
                <div className="cards">
                  {byCat(excluded).map((p) => (
                    <PlaceCard key={p.id} place={p} me={me} isOwner={isOwner} destination={trip.destination} nick={nick} onChanged={reload} />
                  ))}
                </div>
              )}
            </div>
          )}

          {isOwner && places.length > 0 && (
            <button type="button" className="btn ghost" onClick={recommend} disabled={busy}>
              {busy ? '찾는 중…' : '✨ 더 추천받기'}
            </button>
          )}
        </div>

        <aside className="stack">
          <MembersPanel trip={trip} members={members} isOwner={isOwner} onChanged={reload} />
          <section className="panel stack">
            <div className="row-between">
              <h3 className="section-title">장소 직접 추가</h3>
              <button type="button" className="btn sm ghost" aria-expanded={showAdd} onClick={() => setShowAdd((s) => !s)}>
                {showAdd ? '닫기' : '열기'}
              </button>
            </div>
            {showAdd ? (
              <AddPlaceForm
                trip={trip}
                me={me}
                onAdded={(msg) => {
                  setNote({ mood: 'celebrate', text: msg })
                  reload()
                }}
              />
            ) : (
              <p className="muted small">유튜브나 인스타에서 본 곳을 이름과 링크로 올려 주세요.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
