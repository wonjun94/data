import { createBrowserClient } from '@supabase/ssr'

// 브라우저용 클라이언트. 공개용 anon 키만 쓰며, 모든 접근은 RLS 규칙을 따른다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
