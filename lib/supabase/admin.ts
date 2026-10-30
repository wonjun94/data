import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// 서버 전용 관리자 클라이언트(service_role). RLS를 무시하므로 API 라우트에서만 쓰고 브라우저 코드에서 import하지 않는다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았어요.')
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
