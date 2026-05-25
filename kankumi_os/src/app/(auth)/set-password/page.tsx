'use client'

import { useActionState } from 'react'
import { setPassword } from '@/app/actions/auth'

export default function SetPasswordPage() {
  const [error, action, isPending] = useActionState(setPassword, null)

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
        パスワードを設定
      </h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        次回以降のログインに使用するパスワードを設定してください。
      </p>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="8文字以上"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード（確認） <span className="text-red-500">*</span>
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            placeholder="もう一度入力"
            autoComplete="new-password"
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
          {isPending ? '設定中...' : 'パスワードを設定してはじめる'}
        </button>
      </form>
    </>
  )
}
