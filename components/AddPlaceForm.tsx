'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { Category, GeoHit, Trip } from '@/lib/types'

// 유튜브·인스타에서 본 장소를 이름과 링크로 직접 추가
export default function AddPlaceForm({ trip, me, onAdded }: { trip: Trip; me: string; onAdded: (msg: string) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [link, setLink] = useState('')
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const l = link.trim()
    if (!n) return
    if (l && !/^https?:\/\//i.test(l)) return setError('링크는 http:// 또는 https:// 로 시작해야 해요.')
    setBusy(true)
    setError('')

    let hit: GeoHit | undefined
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(n)}&lat=${trip.lat}&lon=${trip.lon}`)
      hit = (await r.json()).results?.[0]
    } catch {}

    const { error } = await createClient()
      .from('places')
      .insert({
        trip_id: trip.id,
        name: n.slice(0, 80),
        category,
        area: hit?.area || null,
        reason: memo.trim() || null,
        source: 'user',
        added_by: me,
        link: l || null,
        lat: hit?.lat ?? null,
        lon: hit?.lon ?? null,
        geo_verified: !!hit,
      })
    setBusy(false)
    if (error) {
      setError(error.code === '23505' ? '이미 후보에 있는 장소예요.' : '추가하지 못했어요. 다시 시도해 주세요.')
      return
    }
    setName('')
    setLink('')
    setMemo('')
    onAdded(hit ? `${n}을(를) 후보에 추가했어요!` : `${n}을(를) 추가했어요. 위치는 찾지 못해 ‘위치 확인 필요’로 표시돼요.`)
  }

  return (
    <form className="addform" onSubmit={submit}>
      <div className="addform-row">
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="장소 이름 (예: 우미카지 테라스)" aria-label="장소 이름" />
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="분류">
          {CATEGORIES.map((c) => (
            <option key={c.k} value={c.k}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="참고 링크 (유튜브·인스타 등, 선택)" aria-label="참고 링크" inputMode="url" />
      <input maxLength={200} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="한 줄 메모 (선택)" aria-label="메모" />
      {error && <p className="error small">{error}</p>}
      <button className="btn primary" disabled={busy || !name.trim()}>
        {busy ? '위치 찾는 중…' : '후보에 추가'}
      </button>
    </form>
  )
}
