import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // パスワードリセットフローは設定画面へ
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/set-password`)
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

        // 招待経由ユーザー（inviteUserByEmail で作成）はパスワード設定画面へ
        if (user.invited_at) {
          return NextResponse.redirect(`${origin}/set-password`)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}
