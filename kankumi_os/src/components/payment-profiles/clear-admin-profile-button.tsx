'use client'

import { useTransition } from 'react'

interface ClearAdminProfileButtonProps {
  action: () => Promise<{ error: string | null }>
}

export function ClearAdminProfileButton({ action }: ClearAdminProfileButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('管理者による振込情報の修正を削除しますか？')) return
    startTransition(async () => {
      await action()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
