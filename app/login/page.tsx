'use client'

import { useEffect, useState } from 'react'
import LoginForm from '@/components/LoginForm'

function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export default function LoginPage() {
  const [next, setNext] = useState('/')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setNext(safeNext(sp.get('next')))
    setFailed(sp.get('error') === '1')
  }, [])

  return (
    <div className="narrow stack">
      <h1>로그인</h1>
      {failed && (
        <p className="error small">
          로그인 링크가 만료됐거나 다른 브라우저에서 열렸어요. 다시 받아 주세요.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  )
}
