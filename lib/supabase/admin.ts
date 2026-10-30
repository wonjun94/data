import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 서버 전용 관리자 클라이언트(service_role). RLS를 무시하므로 API 라우트에서만 쓰고 브라우저 코드에서 import하지 않는다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
    throw new Error(`서버에 Supabase 설정이 없어요: ${missing.join(', ')} 값을 .env.local(또는 Vercel 환경 변수)에 넣고 서버를 다시 켜 주세요.`)
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
