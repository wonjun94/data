'use client'

import { useState } from 'react'
import { CAT, mapsSearchUrl, voteCounts } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { PlaceWithOpinions } from '@/lib/types'

type Props = {
  place: PlaceWithOpinions
  me: string
  isOwner: boolean
  destination: string
  nick: Map<string, string>
  onChanged: () => void
}

export default function PlaceCard({ place: p, me, isOwner, destination, nick, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const c = CAT[p.category]
  const { up, down } = voteCounts(p.opinions)
  const myVote = p.opinions.find((o) => o.user_id === me && o.vote)
  const comments = p.opinions.filter((o) => o.comment).sort((a, b) => a.created_at.localeCompare(b.created_at))

  async function run(fn: () => PromiseLike<unknown>) {
    setBusy(true)
    await fn()
    setBusy(false)
    onChanged()
  }

  // 1인 1표. 같은 버튼을 다시 누르면 취소, 반대 버튼이면 바꾸기
  function vote(v: 'up' | 'down') {
    const sb = createClient()
    run(() => {
      if (myVote?.vote === v) return sb.from('opinions').delete().eq('id', myVote.id)
      if (myVote) return sb.from('opinions').update({ vote: v }).eq('id', myVote.id)
      return sb.from('opinions').insert({ place_id: p.id, user_id: me, vote: v })
    })
  }

  function addComment(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    run(() => createClient().from('opinions').insert({ place_id: p.id, user_id: me, comment: t.slice(0, 300) }))
  }

  function setStatus(s: 'candidate' | 'confirmed' | 'excluded') {
    run(() => createClient().from('places').update({ status: s }).eq('id', p.id))
  }

  return (
    <article className={`pcard status-${p.status}`} style={{ ['--c' as any]: c.color }}>
      <div className="pcard-top">
        <span className="cat">{c.label}</span>
        {p.source === 'ai' ? (
          <span className="badge">AI 추천</span>
        ) : (
          <span className="badge user">{nick.get(p.added_by ?? '') ?? '동행'} 추가</span>
        )}
        {p.geo_verified === false && <span className="badge warn">위치 확인 필요</span>}
        {p.status === 'confirmed' && <span className="badge ok">확정</span>}
      </div>

      <h3>{p.name}</h3>
      {(p.area || p.name_local) && (
        <p className="muted small">
          {p.area}
          {p.area && p.name_local ? ' · ' : ''}
          {p.name_local}
        </p>
      )}
      {p.reason && <p className="reason">{p.reason}</p>}

      <div className="links small">
        <a href={mapsSearchUrl(p.name, p.name_local, destination)} target="_blank" rel="noopener noreferrer">
          구글 맵에서 확인 ↗
        </a>
        {p.link && (
          <a href={p.link} target="_blank" rel="noopener noreferrer">
            참고 링크 ↗
          </a>
        )}
      </div>

      <div className="vote-row">
        <button type="button" className="vote" aria-pressed={myVote?.vote === 'up'} disabled={busy} onClick={() => vote('up')}>
          👍 좋아요 <b>{up}</b>
        </button>
        <button type="button" className="vote" aria-pressed={myVote?.vote === 'down'} disabled={busy} onClick={() => vote('down')}>
          👎 별로 <b>{down}</b>
        </button>
        <button type="button" className="vote ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          💬 {comments.length}
        </button>
      </div>

      {open && (
        <div className="comments">
          {comments.length === 0 && <p className="muted small">아직 코멘트가 없어요.</p>}
          <ul>
            {comments.map((o) => (
              <li key={o.id}>
                <b>{nick.get(o.user_id) ?? '동행'}</b> {o.comment}
                {o.user_id === me && (
                  <button
                    type="button"
                    className="x"
                    aria-label="코멘트 지우기"
                    onClick={() => run(() => createClient().from('opinions').delete().eq('id', o.id))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={addComment} className="comment-form">
            <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="코멘트 남기기" aria-label="코멘트" />
            <button className="btn sm primary" disabled={busy || !text.trim()}>
              등록
            </button>
          </form>
        </div>
      )}

      {isOwner && (
        <div className="owner-row">
          {p.status !== 'confirmed' && (
            <button type="button" className="btn sm primary" disabled={busy} onClick={() => setStatus('confirmed')}>
              확정
            </button>
          )}
          {p.status !== 'excluded' && (
            <button type="button" className="btn sm ghost" disabled={busy} onClick={() => setStatus('excluded')}>
              제외
            </button>
          )}
          {p.status !== 'candidate' && (
            <button type="button" className="btn sm ghost" disabled={busy} onClick={() => setStatus('candidate')}>
              후보로 되돌리기
            </button>
          )}
        </div>
      )}
    </article>
  )
}
