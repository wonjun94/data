import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버(API 라우트)용 클라이언트. 요청한 사용자의 로그인 쿠키로 동작하므로 RLS가 그대로 적용된다.
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // 쿠키를 쓸 수 없는 곳에서 호출되면 무시 (미들웨어가 세션을 갱신함)
          }
        },
      },
    },
  )
}
