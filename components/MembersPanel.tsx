'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Member, Trip } from '@/lib/types'

export default function MembersPanel({ trip, members, isOwner, onChanged }: { trip: Trip; members: Member[]; isOwner: boolean; onChanged: () => void }) {
  const [copied, setCopied] = useState(false)
  const approved = members.filter((m) => m.status === 'approved')
  const pending = members.filter((m) => m.status === 'pending')
  const full = approved.length >= 6

  async function copyInvite() {
    const url = `${window.location.origin}/join/${trip.invite_code}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('이 링크를 복사해 동행에게 보내 주세요', url)
    }
  }

  async function decide(m: Member, status: 'approved' | 'rejected') {
    await createClient().from('members').update({ status }).eq('trip_id', trip.id).eq('user_id', m.user_id)
    onChanged()
  }

  return (
    <section className="panel stack members">
      <div className="row-between">
        <h3 className="section-title">참여자 {approved.length}/6</h3>
        {isOwner && (
          <button type="button" className="btn sm primary" onClick={copyInvite}>
            {copied ? '복사했어요!' : '초대 링크 복사'}
          </button>
        )}
      </div>
      <ul className="people">
        {approved.map((m) => (
          <li key={m.user_id}>
            <span className="avatar">{m.nickname.slice(0, 1)}</span>
            {m.nickname}
            {m.role === 'owner' && <span className="badge">방장</span>}
          </li>
        ))}
      </ul>
      {isOwner && pending.length > 0 && (
        <div className="stack-sm">
          <p className="small"><b>승인 대기 {pending.length}명</b></p>
          <ul className="people">
            {pending.map((m) => (
              <li key={m.user_id}>
                <span className="avatar ghost">{m.nickname.slice(0, 1)}</span>
                {m.nickname}
                <span className="spacer" />
                <button type="button" className="btn sm primary" disabled={full} onClick={() => decide(m, 'approved')}>
                  승인
                </button>
                <button type="button" className="btn sm ghost" onClick={() => decide(m, 'rejected')}>
                  거절
                </button>
              </li>
            ))}
          </ul>
          {full && <p className="muted small">최대 6명까지 함께할 수 있어요.</p>}
        </div>
      )}
    </section>
  )
}
