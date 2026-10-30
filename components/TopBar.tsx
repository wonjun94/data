'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'
import { MascotFigure } from './Mascot'

type Me = { nickname: string; is_admin: boolean }

export default function TopBar() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    if (!hasSupabaseEnv()) return
    const sb = createClient()
    const load = async (uid: string | undefined) => {
      if (!uid) return setMe(null)
      const { data } = await sb.from('profiles').select('nickname, is_admin').eq('id', uid).maybeSingle()
      setMe(data ?? null)
    }
    sb.auth.getUser().then(({ data }) => load(data.user?.id))
    const { data } = sb.auth.onAuthStateChange((e, session) => {
      if (e === 'SIGNED_OUT' || e === 'SIGNED_IN') load(session?.user?.id)
    })
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
        <span>떠날지도</span>
      </Link>
      <div className="topbar-right">
        {me ? (
          <>
            {me.is_admin && (
              <Link href="/admin" className="btn sm primary">
                관리
              </Link>
            )}
            <span className="small ellipsis">
              <b>{me.nickname}</b>님
            </span>
            <button type="button" className="btn ghost sm" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className="btn ghost sm">
            로그인 · 회원가입
          </Link>
        )}
      </div>
    </header>
  )
}
