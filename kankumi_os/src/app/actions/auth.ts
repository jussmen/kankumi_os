'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function signIn(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return 'メールアドレスまたはパスワードが正しくありません。'
  }

  redirect('/dashboard')
}

export async function signUp(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return 'パスワードが一致しません。'
  }

  if (password.length < 6) {
    return 'パスワードは6文字以上で入力してください。'
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.includes('already registered')) {
      return 'このメールアドレスはすでに登録されています。'
    }
    return 'アカウントの作成に失敗しました。もう一度お試しください。'
  }

  redirect('/onboarding')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function setPassword(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) return 'パスワードは8文字以上で設定してください。'
  if (password !== confirm) return 'パスワードが一致しません。'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return 'セッションが無効です。招待メールのリンクから再度アクセスしてください。'

  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) return `パスワードの設定に失敗しました: ${updateError.message}`

  // 招待フローは /auth/callback を経由しないため、ここで組織メンバーを有効化する。
  // パスワードリセットフロー（すでに active）でも実行するが no-op になるだけで無害。
  const adminClient = createAdminClient()
  await adminClient
    .from('organization_members')
    .update({ is_active: true })
    .eq('user_id', user.id)
    .eq('is_active', false)

  // unit_owners にメールアドレスで紐付けられているレコードに user_id をセット
  await adminClient
    .from('unit_owners')
    .update({ user_id: user.id })
    .eq('email', user.email)
    .is('user_id', null)

  // パスワード設定後、新しいパスワードで再ログインしてセッションを確立
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (signInError) return `パスワードは設定されましたが、ログインに失敗しました: ${signInError.message}`

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
