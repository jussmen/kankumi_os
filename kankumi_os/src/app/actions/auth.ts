'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  const password = formData.get('confirmPassword') as string
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

  if (password.length < 8) return 'パスワードは8文字以上で設定してください。'
  if (password !== confirm) return 'パスワードが一致しません。'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'セッションが無効です。招待メールのリンクから再度アクセスしてください。'

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return `パスワードの設定に失敗しました: ${error.message}`

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
