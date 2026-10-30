'use client'

import { useEffect, useState } from 'react'
import LoginForm from '@/components/LoginForm'

function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export default function LoginPage() {
  const [next, setNext] = useState('/')

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get('next')))
  }, [])

  return (
    <div className="narrow stack">
      <h1>로그인 · 회원가입</h1>
      <LoginForm next={next} />
    </div>
  )
}
