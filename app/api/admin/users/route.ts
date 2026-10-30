import { NextResponse, type NextRequest } from 'next/server'
import { checkPassword, requireAdmin } from '@/lib/accounts'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/users → 모든 계정 + 만든 방·참여 방·의견 수
export async function GET() {
  const a = await requireAdmin()
  if (a.res) return a.res
  const db = createAdminClient()
  const [{ data: profiles }, { data: trips }, { data: members }, { data: opinions }] = await Promise.all([
    db.from('profiles').select('id, nickname, is_admin, created_at').order('created_at', { ascending: false }),
    db.from('trips').select('owner_id'),
    db.from('members').select('user_id').eq('status', 'approved'),
    db.from('opinions').select('user_id'),
  ])
  const count = (rows: { [k: string]: string }[] | null, key: string) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r[key], (m.get(r[key]) ?? 0) + 1)
    return m
  }
  const owned = count(trips, 'owner_id')
  const joined = count(members, 'user_id')
  const ops = count(opinions, 'user_id')
  const users = (profiles ?? []).map((p) => ({
    ...p,
    trips_owned: owned.get(p.id) ?? 0,
    trips_joined: joined.get(p.id) ?? 0,
    opinions: ops.get(p.id) ?? 0,
  }))
  return NextResponse.json({ users, me: a.userId })
}

// DELETE /api/admin/users { id } → 계정 삭제 (그 사람이 만든 방, 표, 코멘트도 함께 지워짐)
export async function DELETE(req: NextRequest) {
  const a = await requireAdmin()
  if (a.res) return a.res
  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return NextResponse.json({ error: 'id가 필요해요' }, { status: 400 })
  const db = createAdminClient()
  const { data: p } = await db.from('profiles').select('is_admin').eq('id', id).maybeSingle()
  if (p?.is_admin) return NextResponse.json({ error: '관리자 계정은 지울 수 없어요' }, { status: 400 })
  const { error } = await db.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: '삭제하지 못했어요' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/users { id, password } → 비밀번호 초기화 (비밀번호를 잊은 사람용)
export async function PATCH(req: NextRequest) {
  const a = await requireAdmin()
  if (a.res) return a.res
  const body = await req.json().catch(() => ({}))
  if (typeof body.id !== 'string') return NextResponse.json({ error: 'id가 필요해요' }, { status: 400 })
  const p = checkPassword(body.password)
  if (p.error) return NextResponse.json({ error: p.error }, { status: 400 })
  const { error } = await createAdminClient().auth.admin.updateUserById(body.id, { password: p.password })
  if (error) return NextResponse.json({ error: '비밀번호를 바꾸지 못했어요' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
