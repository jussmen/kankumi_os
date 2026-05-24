'use client'

import { useActionState } from 'react'
import { runAutoMatch } from '@/app/actions/matching'

export function AutoMatchButton({ yearMonth }: { yearMonth: string }) {
  const action = runAutoMatch.bind(null, yearMonth)
  const [result, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      {result !== null && !result.error && (
        <p className="text-xs text-green-600">
          {result.matched > 0 ? `${result.matched}件照合しました` : '新たな照合はありません'}
        </p>
      )}
      {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '照合中...' : '自動照合実行'}
      </button>
    </form>
  )
}
