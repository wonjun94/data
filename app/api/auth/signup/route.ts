import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_NICKNAME, checkNickname, checkPassword, createAccount, findProfile, signIn } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

// POST /api/auth/signup { nickname, password } → 계정을 만들고 바로 로그인
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const n = checkNickname(body.nickname)
  if (n.error) return NextResponse.json({ error: n.error }, { status: 400 })
  const p = checkPassword(body.password)
  if (p.error) return NextResponse.json({ error: p.error }, { status: 400 })
  const nickname = n.nickname!
  const password = p.password!

  if (nickname.toLowerCase() === ADMIN_NICKNAME.toLowerCase())
    return NextResponse.json({ error: '쓸 수 없는 닉네임이에요.' }, { status: 409 })

  try {
    if (await findProfile(nickname)) return NextResponse.json({ error: '이미 쓰고 있는 닉네임이에요.' }, { status: 409 })
    const made = await createAccount(nickname, password)
    if (made.error) return NextResponse.json({ error: made.error }, { status: 400 })
    await signIn(made.id!, password)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
