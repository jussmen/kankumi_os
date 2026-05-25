'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?type=recovery`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        setError('送信に失敗しました。メールアドレスをご確認ください。')
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          メールを送信しました
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {email} にパスワード再設定のリンクを送りました。メールをご確認ください。
        </p>
        <p className="text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
            ログイン画面に戻る
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
        パスワードの再設定
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '送信中...' : '再設定メールを送る'}
        </button>
      </form>

      <p className="mt-4 text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
          ← ログイン画面に戻る
        </Link>
      </p>
    </>
  )
}
