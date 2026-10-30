import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/accounts'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/opinions?type=all|vote|comment → 최근 좋아요·별로·코멘트 (최대 300개)
export async function GET(req: NextRequest) {
  const a = await requireAdmin()
  if (a.res) return a.res
  const type = req.nextUrl.searchParams.get('type')
  const db = createAdminClient()
  let q = db
    .from('opinions')
    .select('id, vote, comment, created_at, user_id, places(name, trip_id, trips(destination))')
    .order('created_at', { ascending: false })
    .limit(300)
  if (type === 'vote') q = q.not('vote', 'is', null)
  if (type === 'comment') q = q.not('comment', 'is', null)
  const [{ data, error }, { data: profiles }] = await Promise.all([q, db.from('profiles').select('id, nickname')])
  if (error) return NextResponse.json({ error: '불러오지 못했어요' }, { status: 500 })
  const nick = new Map((profiles ?? []).map((p) => [p.id, p.nickname]))
  const rows = (data ?? []).map((o: any) => ({
    id: o.id,
    vote: o.vote,
    comment: o.comment,
    created_at: o.created_at,
    nickname: nick.get(o.user_id) ?? '(삭제된 계정)',
    place: o.places?.name ?? '',
    trip_id: o.places?.trip_id ?? null,
    destination: o.places?.trips?.destination ?? '',
  }))
  return NextResponse.json({ rows })
}

// DELETE /api/admin/opinions { ids: [...] } → 선택한 좋아요·코멘트 삭제
export async function DELETE(req: NextRequest) {
  const a = await requireAdmin()
  if (a.res) return a.res
  const { ids } = await req.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((x) => typeof x !== 'string'))
    return NextResponse.json({ error: '지울 항목을 골라 주세요' }, { status: 400 })
  const { error, count } = await createAdminClient().from('opinions').delete({ count: 'exact' }).in('id', ids.slice(0, 500))
  if (error) return NextResponse.json({ error: '삭제하지 못했어요' }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}
