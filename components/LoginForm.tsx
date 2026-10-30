'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Mascot from './Mascot'

// 비밀번호 없는 이메일 매직 링크 로그인. 로그인 후 next 주소로 돌아온다.
export default function LoginForm({ next, intro }: { next: string; intro?: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect },
    })
    if (error) {
      setError(error.message.includes('rate') ? '메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.' : error.message)
      setState('error')
    } else setState('sent')
  }

  if (state === 'sent')
    return (
      <div className="stack">
        <Mascot mood="celebrate" text="메일을 확인하세요! 받은 링크를 누르면 바로 들어와요." />
        <p className="muted small">
          <b>{email}</b>로 로그인 링크를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
        <button type="button" className="btn ghost" onClick={() => setState('idle')}>
          다른 이메일로 받기
        </button>
      </div>
    )

  return (
    <form className="stack" onSubmit={submit}>
      <Mascot mood={state === 'error' ? 'trouble' : 'welcome'} text={state === 'error' ? error : intro ?? '이메일만 있으면 돼요. 비밀번호는 없어요.'} />
      <label className="field">
        <span>이메일</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button className="btn primary" disabled={state === 'sending'}>
        {state === 'sending' ? '보내는 중…' : '로그인 링크 받기'}
      </button>
    </form>
  )
}
