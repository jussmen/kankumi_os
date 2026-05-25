import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    // レスポンスを先に生成し、クッキーをこのオブジェクトに直接セット
    const response = NextResponse.redirect(`${origin}/dashboard`)

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // パスワードリセットフロー
      if (type === 'recovery') {
        response.headers.set('Location', `${origin}/set-password`)
        return response
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

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

        // 招待経由ユーザーはパスワード設定画面へ
        if (user.invited_at) {
          response.headers.set('Location', `${origin}/set-password`)
          return response
        }
      }

      return response // /dashboard へ
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
