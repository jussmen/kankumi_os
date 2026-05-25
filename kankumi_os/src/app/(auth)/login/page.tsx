'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [error, action, isPending] = useActionState(signIn, null)
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Implicit Flow: invite/recovery メールのリンクは #access_token= の形で着地する
    const hash = window.location.hash
    if (!hash.includes('access_token=')) return

    const params = new URLSearchParams(hash.slice(1))
    const type = params.get('type') // 'invite' | 'recovery' | null

    setRedirecting(true)
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        if (type === 'invite' || type === 'recovery') {
          router.replace('/set-password')
        } else {
          router.replace('/dashboard')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (redirecting) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">
        処理中...
      </p>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        ログイン
      </h1>

      <form action={action} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '処理中...' : 'ログイン'}
        </button>
      </form>

      <p className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          パスワードをお忘れの方
        </Link>
      </p>

      <p className="mt-3 text-center text-sm text-gray-500">
        アカウントは管理者からの招待メールで作成できます。
      </p>
    </>
  )
}
