'use client'

import { useState, useTransition } from 'react'

interface Props {
  action: () => Promise<string | null>
}

export function DeleteUnitButton({ action }: Props) {
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const err = await action()
      if (err) {
        setError(err)
        setConfirm(false)
      }
    })
  }

  if (!confirm) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          この部屋を削除
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-red-600 font-medium">本当に削除しますか？この操作は取り消せません。</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '削除中...' : '削除する'}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
