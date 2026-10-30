'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import LoginForm from '@/components/LoginForm'
import Mascot from '@/components/Mascot'
import { createClient } from '@/lib/supabase/client'

type Preview = { trip_id: string; destination: string; country: string | null; days: number; owner_nickname: string | null; my_status: string | null }
type Phase = 'loading' | 'invalid' | 'login' | 'form' | 'waiting' | 'rejected'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const check = useCallback(async () => {
    const sb = createClient()
    const [{ data: u }, { data: rows }] = await Promise.all([sb.auth.getUser(), sb.rpc('trip_preview', { p_code: code })])
    const p = (rows as Preview[] | null)?.[0] ?? null
    setPreview(p)
    if (!p) return setPhase('invalid')
    if (!u.user) return setPhase('login')
    if (p.my_status === 'approved') return router.replace(`/trip/${p.trip_id}`)
    if (p.my_status === 'pending') return setPhase('waiting')
    if (p.my_status === 'rejected') return setPhase('rejected')
    setPhase((cur) => (cur === 'form' ? cur : 'form'))
  }, [code, router])

  useEffect(() => {
    check()
    try {
      setNickname(localStorage.getItem('tt-nick') || '')
    } catch {}
  }, [check])

  // 승인 대기 중이면 몇 초마다 확인하다가 승인되면 보드로 이동
  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setInterval(check, 4000)
    return () => clearInterval(t)
  }, [phase, check])

  async function join(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setSending(true)
    setError('')
    try {
      localStorage.setItem('tt-nick', nickname.trim())
    } catch {}
    const { error } = await createClient().rpc('join_trip', { p_code: code, p_nickname: nickname.trim() })
    setSending(false)
    if (error) {
      setError(error.message.includes('room full') ? '이 방은 이미 6명이 꽉 찼어요.' : '참여 신청에 실패했어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    setPhase('waiting')
  }

  const title = preview ? `${preview.destination}${preview.days ? ` ${preview.days}일` : ''} 여행` : '여행 방 초대'

  return (
    <div className="narrow stack">
      <h1>{title}</h1>
      {preview?.owner_nickname && phase !== 'invalid' && (
        <p className="muted">{preview.owner_nickname}님이 같이 고르자고 초대했어요.</p>
      )}

      {phase === 'loading' && <Mascot mood="searching" text="초대장을 확인하고 있어요" />}
      {phase === 'invalid' && <Mascot mood="trouble" text="초대 링크가 올바르지 않아요. 방장에게 다시 받아 주세요." />}
      {phase === 'login' && <LoginForm next={`/join/${code}`} intro="먼저 이메일로 로그인해 주세요. 비밀번호는 없어요." />}
      {phase === 'form' && (
        <form className="stack" onSubmit={join}>
          <Mascot mood="welcome" text="동행들에게 보일 닉네임을 정해 주세요." />
          <label className="field">
            <span>닉네임</span>
            <input required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 민지" />
          </label>
          {error && <p className="error small">{error}</p>}
          <button className="btn primary" disabled={sending}>
            {sending ? '신청하는 중…' : '참여 신청하기'}
          </button>
        </form>
      )}
      {phase === 'waiting' && (
        <div className="stack">
          <Mascot mood="trouble" text="방장의 승인을 기다리는 중이에요." />
          <p className="muted small">승인되면 자동으로 후보 보드로 이동해요. 이 화면을 열어 두세요.</p>
        </div>
      )}
      {phase === 'rejected' && <Mascot mood="trouble" text="방장이 참여를 거절했어요. 방장에게 확인해 주세요." />}
    </div>
  )
}
