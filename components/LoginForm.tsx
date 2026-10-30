'use client'

import { useState } from 'react'
import Mascot from './Mascot'

// 닉네임 + 비밀번호 로그인·회원가입. 성공하면 next 주소로 이동한다.
export default function LoginForm({ next, intro }: { next: string; intro?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'signup' && password !== confirm) return setError('비밀번호가 서로 달라요.')
    setSending(true)
    setError('')
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: nickname.trim(), password }),
    }).catch(() => null)
    const j = res ? await res.json().catch(() => ({})) : {}
    if (!res?.ok) {
      setSending(false)
      setError(j.error || '잠시 후 다시 시도해 주세요.')
      return
    }
    // 세션 쿠키가 생겼으니 화면 전체를 새로 연다
    window.location.href = next
  }

  function switchMode(m: 'login' | 'signup') {
    setMode(m)
    setError('')
    setConfirm('')
  }

  const text = error || (mode === 'signup' ? '닉네임과 비밀번호만 정하면 가입 끝이에요.' : intro ?? '닉네임과 비밀번호로 로그인하세요.')

  return (
    <form className="stack" onSubmit={submit}>
      <div className="segmented two" role="tablist" aria-label="로그인 또는 회원가입">
        <button type="button" role="tab" aria-selected={mode === 'login'} aria-pressed={mode === 'login'} onClick={() => switchMode('login')}>
          로그인
        </button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>
          회원가입
        </button>
      </div>
      <Mascot mood={error ? 'trouble' : 'welcome'} text={text} />
      <label className="field">
        <span>닉네임</span>
        <input
          required
          minLength={2}
          maxLength={20}
          autoComplete="username"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="동행에게 보일 이름 (2~20자)"
        />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input
          type="password"
          required
          minLength={mode === 'signup' ? 6 : 1}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? '6자 이상' : ''}
        />
      </label>
      {mode === 'signup' && (
        <label className="field">
          <span>비밀번호 확인</span>
          <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
      )}
      <button className="btn primary" disabled={sending}>
        {sending ? '잠시만요…' : mode === 'signup' ? '가입하고 시작하기' : '로그인'}
      </button>
    </form>
  )
}
