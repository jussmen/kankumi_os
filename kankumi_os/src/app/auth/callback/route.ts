import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) return NextResponse.redirect(`${origin}/login`)

  // exchangeCodeForSession が設定するクッキーを一旦収集する
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login`)

  // リダイレクト先を決定する
  let redirectPath = '/dashboard'

  if (type === 'recovery') {
    redirectPath = '/set-password'
  } else {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const adminClient = createAdminClient()

      await adminClient
        .from('organization_members')
        .update({ is_active: true })
        .eq('user_id', user.id)
        .eq('is_active', false)

      if (user.email) {
        await adminClient
          .from('unit_owners')
          .update({ user_id: user.id })
          .eq('email', user.email)
          .is('user_id', null)
      }

      if (user.invited_at) {
        redirectPath = '/set-password'
      }
    }
  }

  // リダイレクト先が確定してからレスポンスを生成し、クッキーをセット
  const response = NextResponse.redirect(`${origin}${redirectPath}`)

  // 古いセッション Cookie（削除済みユーザーのチャンク含む）をすべて消去してから
  // 新しいセッション Cookie を設定する。これにより @supabase/ssr が
  // 古いチャンクを誤って読み込む問題を防ぐ。
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
      response.cookies.delete(cookie.name)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as any)
  })

  return response
}
