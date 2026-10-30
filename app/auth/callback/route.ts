import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// 메일의 매직 링크가 도착하는 곳. code(기본) 또는 token_hash(메일 템플릿을 바꾼 경우) 둘 다 처리한다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/') || next.startsWith('//')) next = '/'

  const supabase = createClient()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  let ok = false
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }

  return NextResponse.redirect(ok ? `${origin}${next}` : `${origin}/login?error=1&next=${encodeURIComponent(next)}`)
}
