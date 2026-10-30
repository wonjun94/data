import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_NICKNAME, createAccount, findProfile, signIn } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

const WRONG = '닉네임 또는 비밀번호가 맞지 않아요.'

// POST /api/auth/login { nickname, password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const nickname = String(body.nickname ?? '').trim()
  const password = String(body.password ?? '')
  if (!nickname || !password) return NextResponse.json({ error: WRONG }, { status: 400 })

  try {
    let profile = await findProfile(nickname)

    // 관리자 계정은 서버 환경 변수(ADMIN_NICKNAME/ADMIN_PASSWORD)와 같은 값으로 처음 로그인할 때 만들어진다.
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!profile && adminPassword && nickname === ADMIN_NICKNAME && password === adminPassword) {
      const made = await createAccount(ADMIN_NICKNAME, adminPassword, true)
      if (made.error) return NextResponse.json({ error: made.error }, { status: 500 })
      profile = { id: made.id!, nickname: ADMIN_NICKNAME, is_admin: true }
    }

    if (!profile || !(await signIn(profile.id, password))) return NextResponse.json({ error: WRONG }, { status: 401 })
    return NextResponse.json({ ok: true, isAdmin: profile.is_admin })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
