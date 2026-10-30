'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import LoginForm from '@/components/LoginForm'
import Mascot from '@/components/Mascot'

type User = { id: string; nickname: string; is_admin: boolean; created_at: string; trips_owned: number; trips_joined: number; opinions: number }
type Row = { id: string; vote: 'up' | 'down' | null; comment: string | null; created_at: string; nickname: string; place: string; trip_id: string | null; destination: string }

const day = (s: string) => new Date(s).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

async function call(url: string, method = 'GET', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null)
  const j = res ? await res.json().catch(() => ({})) : { error: '서버에 연결하지 못했어요' }
  return { ok: !!res?.ok, status: res?.status ?? 0, ...j }
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'opinions'>('users')
  const [gate, setGate] = useState<'loading' | 'login' | 'denied' | 'ok'>('loading')
  const [users, setUsers] = useState<User[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [type, setType] = useState<'all' | 'vote' | 'comment'>('all')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [note, setNote] = useState<{ mood: 'welcome' | 'celebrate' | 'trouble'; text: string } | null>(null)

  const loadUsers = useCallback(async () => {
    const r = await call('/api/admin/users')
    if (r.status === 401) return setGate('login')
    if (!r.ok) return setGate('denied')
    setUsers(r.users)
    setGate('ok')
  }, [])

  const loadRows = useCallback(async () => {
    const r = await call(`/api/admin/opinions?type=${type}`)
    if (r.ok) {
      setRows(r.rows)
      setPicked(new Set())
    }
  }, [type])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])
  useEffect(() => {
    if (gate === 'ok' && tab === 'opinions') loadRows()
  }, [gate, tab, loadRows])

  async function removeUser(u: User) {
    if (!window.confirm(`${u.nickname} 계정을 지울까요?\n이 사람이 만든 여행 방(${u.trips_owned}개)과 남긴 좋아요·코멘트(${u.opinions}개)도 함께 지워집니다.`)) return
    const r = await call('/api/admin/users', 'DELETE', { id: u.id })
    setNote(r.ok ? { mood: 'celebrate', text: `${u.nickname} 계정을 지웠어요.` } : { mood: 'trouble', text: r.error })
    loadUsers()
  }

  async function resetPassword(u: User) {
    const pw = window.prompt(`${u.nickname}의 새 비밀번호 (6자 이상)`)
    if (!pw) return
    const r = await call('/api/admin/users', 'PATCH', { id: u.id, password: pw })
    setNote(r.ok ? { mood: 'celebrate', text: `${u.nickname}의 비밀번호를 바꿨어요. 본인에게 알려 주세요.` } : { mood: 'trouble', text: r.error })
  }

  async function removeRows(ids: string[]) {
    if (ids.length === 0) return
    if (!window.confirm(`선택한 ${ids.length}개를 지울까요? 되돌릴 수 없어요.`)) return
    const r = await call('/api/admin/opinions', 'DELETE', { ids })
    setNote(r.ok ? { mood: 'celebrate', text: `${r.deleted}개를 지웠어요.` } : { mood: 'trouble', text: r.error })
    loadRows()
  }

  if (gate === 'loading') return <div className="narrow"><Mascot mood="searching" text="관리 화면을 여는 중이에요" /></div>
  if (gate === 'login')
    return (
      <div className="narrow stack">
        <h1>관리자 로그인</h1>
        <LoginForm next="/admin" intro="관리자 계정으로 로그인해 주세요." />
      </div>
    )
  if (gate === 'denied')
    return (
      <div className="narrow stack">
        <Mascot mood="trouble" text="관리자만 볼 수 있는 화면이에요." />
        <Link href="/" className="btn ghost">처음 화면으로</Link>
      </div>
    )

  const q = query.trim().toLowerCase()
  const shownUsers = q ? users.filter((u) => u.nickname.toLowerCase().includes(q)) : users
  const shownRows = q
    ? rows.filter((r) => [r.nickname, r.place, r.destination, r.comment ?? ''].some((s) => s.toLowerCase().includes(q)))
    : rows
  const allPicked = shownRows.length > 0 && shownRows.every((r) => picked.has(r.id))

  return (
    <div className="stack-lg">
      <section className="board-head">
        <div className="stack-sm">
          <Link href="/" className="muted small">← 지구본으로</Link>
          <h1>관리</h1>
        </div>
        <div className="segmented two" role="tablist" aria-label="관리 항목">
          <button type="button" role="tab" aria-pressed={tab === 'users'} aria-selected={tab === 'users'} onClick={() => setTab('users')}>
            계정 {users.length}
          </button>
          <button type="button" role="tab" aria-pressed={tab === 'opinions'} aria-selected={tab === 'opinions'} onClick={() => setTab('opinions')}>
            좋아요·댓글
          </button>
        </div>
      </section>

      {note && <Mascot mood={note.mood} text={note.text} />}

      <div className="toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder={tab === 'users' ? '닉네임 검색' : '닉네임·장소·여행지·내용 검색'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="검색"
        />
        {tab === 'opinions' && (
          <div className="row-gap">
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="종류">
              <option value="all">전체</option>
              <option value="vote">좋아요·별로만</option>
              <option value="comment">댓글만</option>
            </select>
            <button type="button" className="btn sm danger" disabled={picked.size === 0} onClick={() => removeRows([...picked])}>
              선택 삭제 {picked.size > 0 ? picked.size : ''}
            </button>
          </div>
        )}
      </div>

      {tab === 'users' ? (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>가입</th>
                <th className="num">만든 방</th>
                <th className="num">참여 방</th>
                <th className="num">좋아요·댓글</th>
                <th aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {shownUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.nickname}</b> {u.is_admin && <span className="badge">관리자</span>}
                  </td>
                  <td className="muted">{day(u.created_at)}</td>
                  <td className="num">{u.trips_owned}</td>
                  <td className="num">{u.trips_joined}</td>
                  <td className="num">{u.opinions}</td>
                  <td className="actions">
                    <button type="button" className="btn sm ghost" onClick={() => resetPassword(u)}>
                      비밀번호 초기화
                    </button>
                    {!u.is_admin && (
                      <button type="button" className="btn sm danger" onClick={() => removeUser(u)}>
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shownUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">계정이 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="모두 선택"
                    checked={allPicked}
                    onChange={() => setPicked(allPicked ? new Set() : new Set(shownRows.map((r) => r.id)))}
                  />
                </th>
                <th>종류</th>
                <th>내용</th>
                <th>작성자</th>
                <th>장소 · 여행지</th>
                <th>시간</th>
                <th aria-label="삭제" />
              </tr>
            </thead>
            <tbody>
              {shownRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label="선택"
                      checked={picked.has(r.id)}
                      onChange={() =>
                        setPicked((cur) => {
                          const s = new Set(cur)
                          if (s.has(r.id)) s.delete(r.id)
                          else s.add(r.id)
                          return s
                        })
                      }
                    />
                  </td>
                  <td>{r.comment ? '💬 댓글' : r.vote === 'up' ? '👍 좋아요' : '👎 별로'}</td>
                  <td className="wrap-cell">{r.comment ?? ''}</td>
                  <td>{r.nickname}</td>
                  <td>
                    {r.place}
                    <span className="muted"> · {r.destination}</span>
                  </td>
                  <td className="muted">{day(r.created_at)}</td>
                  <td className="actions">
                    <button type="button" className="btn sm danger" onClick={() => removeRows([r.id])}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {shownRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">항목이 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
