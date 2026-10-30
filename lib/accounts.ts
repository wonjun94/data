import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase/admin'
import { createClient } from './supabase/server'

// 닉네임·비밀번호 계정. Supabase Auth는 이메일이 필요하므로, 사용자에게 보이지 않는 내부용 주소를 만들어 쓴다.
// 메일은 보내지 않는다 (관리자 API로 확인된 상태로 생성).
const EMAIL_DOMAIN = process.env.AUTH_EMAIL_DOMAIN || 'trip-together.local'

export const ADMIN_NICKNAME = process.env.ADMIN_NICKNAME || 'root'

export function checkNickname(raw: unknown) {
  const nickname = String(raw ?? '').trim()
  if (nickname.length < 2 || nickname.length > 20) return { error: '닉네임은 2~20자로 정해 주세요.' }
  if (/[\s@]/.test(nickname)) return { error: '닉네임에는 공백이나 @를 쓸 수 없어요.' }
  return { nickname }
}

export function checkPassword(raw: unknown) {
  const password = String(raw ?? '')
  if (password.length < 6 || password.length > 72) return { error: '비밀번호는 6자 이상으로 정해 주세요.' }
  return { password }
}

export async function findProfile(nickname: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, nickname, is_admin')
    .ilike('nickname', nickname.replace(/[\\%_]/g, (c) => `\\${c}`))
    .maybeSingle()
  return data
}

// 계정 생성 (가입 또는 관리자 자동 생성)
export async function createAccount(nickname: string, password: string, isAdmin = false) {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: `u-${randomUUID()}@${EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { nickname },
  })
  if (error || !data.user) return { error: error?.message ?? '계정을 만들지 못했어요.' }
  const { error: pErr } = await admin.from('profiles').insert({ id: data.user.id, nickname, is_admin: isAdmin })
  if (pErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { error: pErr.code === '23505' ? '이미 쓰고 있는 닉네임이에요.' : '계정을 만들지 못했어요.' }
  }
  return { id: data.user.id }
}

// 닉네임으로 계정을 찾아 로그인하고, 세션 쿠키를 응답에 심는다.
export async function signIn(profileId: string, password: string) {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(profileId)
  const email = data.user?.email
  if (!email) return false
  const { error } = await createClient().auth.signInWithPassword({ email, password })
  return !error
}

// 관리자 API에서 요청한 사람이 관리자인지 확인
export async function requireAdmin() {
  const { data } = await createClient().auth.getUser()
  if (!data.user) return { res: NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 }) }
  const { data: p } = await createAdminClient().from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle()
  if (!p?.is_admin) return { res: NextResponse.json({ error: '관리자만 할 수 있어요' }, { status: 403 }) }
  return { userId: data.user.id }
}
