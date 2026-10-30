'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Globe, { type GlobePin } from '@/components/Globe'
import Mascot from '@/components/Mascot'
import { createClient } from '@/lib/supabase/client'
import { BUDGETS, BUDGET_LABEL, STYLE_TAGS, THEMES } from '@/lib/constants'
import destinations from '@/lib/destinations.json'
import type { Budget, Destination, GeoHit } from '@/lib/types'

const DESTS = destinations as Destination[]
const TL = Object.fromEntries(THEMES.map((t) => [t.k, t]))

type Picked = { id: string; name: string; country: string; lat: number; lon: number; desc?: string; tip?: string }
type MyTrip = { trip_id: string; role: string; status: string; trips: { destination: string; days: number; created_at: string } | null }

const DRAFT_KEY = 'tt-draft'
const NICK_KEY = 'tt-nick'

function cssVar(name: string) {
  if (typeof window === 'undefined') return '#1D5F8C'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#1D5F8C'
}

export default function Home() {
  const router = useRouter()
  const [theme, setTheme] = useState('all')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GeoHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [days, setDays] = useState(4)
  const [budget, setBudget] = useState<Budget>('mid')
  const [tags, setTags] = useState<string[]>([])
  const [nickname, setNickname] = useState('')
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [myTrips, setMyTrips] = useState<MyTrip[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [, setColorTick] = useState(0)

  useEffect(() => {
    // 로그인하러 다녀오기 전에 고르던 내용을 복원
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d?.picked) {
        setPicked(d.picked)
        setDays(d.days ?? 4)
        setBudget(d.budget ?? 'mid')
        setTags(d.tags ?? [])
      }
      setNickname(localStorage.getItem(NICK_KEY) || '')
    } catch {}
    setColorTick(1) // CSS 변수 색을 읽을 수 있게 된 뒤 핀 색을 다시 계산

    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (!uid) return
      const { data: rows } = await sb
        .from('members')
        .select('trip_id, role, status, trips(destination, days, created_at)')
        .eq('user_id', uid)
        .order('joined_at', { ascending: false })
      setMyTrips((rows as any) ?? [])
    })
  }, [])

  const visible = useMemo(() => DESTS.filter((d) => theme === 'all' || d.themes.includes(theme)), [theme])

  const pins: GlobePin[] = useMemo(() => {
    const list: GlobePin[] = visible.map((d) => ({
      id: d.id,
      name: d.name,
      sub: d.country,
      lat: d.lat,
      lon: d.lon,
      color: cssVar(TL[theme === 'all' ? d.themes[0] : theme].v),
    }))
    if (picked && !list.some((p) => p.id === picked.id))
      list.push({ id: picked.id, name: picked.name, sub: picked.country, lat: picked.lat, lon: picked.lon, color: cssVar('--accent') })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, picked, theme, cssVar('--accent')])

  function pickDest(id: string) {
    const d = DESTS.find((x) => x.id === id)
    if (d) setPicked({ id: d.id, name: d.name, country: d.country, lat: d.lat, lon: d.lon, desc: d.desc, tip: d.tip })
    setError('')
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const j = await res.json()
      setHits(j.results ?? [])
    } catch {
      setHits([])
    }
    setSearching(false)
  }

  function pickHit(h: GeoHit) {
    setPicked({ id: `search-${h.lat.toFixed(3)}-${h.lon.toFixed(3)}`, name: h.name, country: h.country, lat: h.lat, lon: h.lon })
    setHits(null)
    setError('')
  }

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length >= 5 ? cur : [...cur, t]))
  }

  async function create() {
    if (!picked) return
    if (tags.length === 0) return setError('스타일 태그를 1개 이상 골라 주세요.')
    if (!nickname.trim()) return setError('동행에게 보일 내 닉네임을 적어 주세요.')
    try {
      localStorage.setItem(NICK_KEY, nickname.trim())
    } catch {}
    if (!userId) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ picked, days, budget, tags }))
      } catch {}
      router.push('/login?next=/')
      return
    }
    setCreating(true)
    setError('')
    const { data, error } = await createClient().rpc('create_trip', {
      p_destination: picked.name,
      p_country: picked.country || null,
      p_lat: picked.lat,
      p_lon: picked.lon,
      p_days: days,
      p_budget: budget,
      p_style_tags: tags,
      p_nickname: nickname.trim(),
    })
    if (error || !data) {
      setCreating(false)
      setError('방을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {}
    router.push(`/trip/${data}?new=1`)
  }

  const mascotText = picked
    ? `${picked.name}, 좋은 선택이에요! 며칠 동안 갈까요?`
    : '어디로 떠나 볼까요? 도시를 검색하거나 지구본의 핀을 눌러 보세요.'

  return (
    <div className="stack-lg">
      <section className="hero">
        <div>
          <h1>동행과 함께 고르는 여행지</h1>
          <p className="muted">AI가 후보를 추리고, 다 같이 좋아요를 누르고, 확정한 곳은 구글 ‘내 지도’로 옮겨요.</p>
        </div>
        <Mascot mood="welcome" text={mascotText} />
      </section>

      <nav className="chips" aria-label="여행 테마">
        {THEMES.map((t) => {
          const n = t.k === 'all' ? DESTS.length : DESTS.filter((d) => d.themes.includes(t.k)).length
          return (
            <button
              key={t.k}
              type="button"
              className="chip"
              style={{ ['--c' as any]: `var(${t.v})` }}
              aria-pressed={theme === t.k}
              onClick={() => setTheme(t.k)}
            >
              <span className="dot" />
              {t.label}
              <span className="n">{n}</span>
            </button>
          )
        })}
      </nav>

      <div className="home-grid">
        <Globe pins={pins} selectedId={picked?.id ?? null} focus={picked ? { lat: picked.lat, lon: picked.lon } : null} onPick={pickDest} />

        <aside className="panel stack">
          <form className="search" onSubmit={search} role="search">
            <input
              type="search"
              placeholder="도시 검색 (예: 오키나와)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="도시 검색"
            />
            <button className="btn primary" disabled={searching}>
              {searching ? '찾는 중' : '검색'}
            </button>
          </form>
          {hits && (
            <ul className="hits">
              {hits.length === 0 && <li className="muted small">검색 결과가 없어요. 영문이나 다른 이름으로 찾아보세요.</li>}
              {hits.map((h, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pickHit(h)}>
                    <b>{h.name}</b>
                    <span className="muted small">{h.display}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked ? (
            <div className="stack">
              <div className="dest-head">
                <span className="muted small">{picked.country}</span>
                <h2>{picked.name}</h2>
                {picked.desc && <p className="small">{picked.desc}</p>}
                {picked.tip && <p className="muted small">추천 시기 · {picked.tip}</p>}
              </div>

              <div className="field">
                <span>일수</span>
                <div className="stepper">
                  <button type="button" onClick={() => setDays((d) => Math.max(1, d - 1))} aria-label="하루 줄이기">－</button>
                  <b>{days}일</b>
                  <button type="button" onClick={() => setDays((d) => Math.min(14, d + 1))} aria-label="하루 늘리기">＋</button>
                </div>
              </div>

              <div className="field">
                <span>예산</span>
                <div className="segmented">
                  {BUDGETS.map((b) => (
                    <button key={b.k} type="button" aria-pressed={budget === b.k} onClick={() => setBudget(b.k)}>
                      {b.label}
                      <small>{b.hint}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>
                  스타일 태그 <small className="muted">({tags.length}/5)</small>
                </span>
                <div className="tagpick">
                  {STYLE_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tags.includes(t)}
                      disabled={!tags.includes(t) && tags.length >= 5}
                      onClick={() => toggleTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>내 닉네임</span>
                <input maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="동행에게 보일 이름" />
              </label>

              {error && <p className="error small">{error}</p>}
              <button type="button" className="btn primary lg" onClick={create} disabled={creating}>
                {creating ? '방 만드는 중…' : userId === null ? '로그인하고 여행 방 만들기' : '여행 방 만들기'}
              </button>
              <p className="muted small">
                {picked.name} · {days}일 · {BUDGET_LABEL[budget]}
                {tags.length > 0 && ` · ${tags.join(', ')}`}
              </p>
            </div>
          ) : (
            <p className="muted">지구본에서 핀을 누르거나 위에서 도시를 검색하면 여행 방을 만들 수 있어요.</p>
          )}
        </aside>
      </div>

      {userId && (
        <section className="stack">
          <h3 className="section-title">내가 참여 중인 방</h3>
          {myTrips.length === 0 ? (
            <p className="muted small">아직 참여 중인 방이 없어요.</p>
          ) : (
            <ul className="trip-list">
              {myTrips.map((t) => (
                <li key={t.trip_id}>
                  <Link href={`/trip/${t.trip_id}`} className="trip-item">
                    <b>{t.trips?.destination ?? '승인 대기 중인 방'}</b>
                    <span className="muted small">
                      {t.trips ? `${t.trips.days}일 · ` : ''}
                      {t.role === 'owner' ? '방장' : t.status === 'approved' ? '동행' : t.status === 'pending' ? '승인 대기' : '참여 거절됨'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="muted small foot">
        추천 여행지 42곳은 기존 테마 여행 지구본에서 가져왔어요. 지도 데이터 © OpenStreetMap 기여자.
      </footer>
    </div>
  )
}
