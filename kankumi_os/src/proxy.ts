import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth フロー系ルートは自前でセッション Cookie を管理するため、
  // ミドルウェアの getUser() を実行しない。
  // getUser() が古い JWT チャンクで 403 を返すと @supabase/ssr が
  // 全セッション Cookie を消去し、callback/set-password が設定した
  // 新しい Cookie まで上書きしてしまう。
  if (pathname.startsWith('/auth/') || pathname === '/set-password') {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createMiddlewareClient(request, response)

  // セッションをリフレッシュする（重要: proxy内でgetUser()を呼ぶことでセッションが更新される）
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
