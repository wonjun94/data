'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'
import { MascotFigure } from './Mascot'

export default function TopBar() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!hasSupabaseEnv()) return
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data } = sb.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  async function logout() {
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <MascotFigure size={34} />
        <span>여행 같이 고르기</span>
      </Link>
      <div className="topbar-right">
        {email ? (
          <>
            <span className="muted small ellipsis">{email}</span>
            <button type="button" className="btn ghost sm" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className="btn ghost sm">
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}
