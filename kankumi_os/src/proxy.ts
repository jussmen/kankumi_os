import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createMiddlewareClient(request, response)

  // セッションをリフレッシュする（重要: proxy内でgetUser()を呼ぶことでセッションが更新される）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 認証が必要なルートへの未認証アクセスを /login にリダイレクト
  if (
    (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) &&
    !user
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
