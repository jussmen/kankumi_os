'use client'

import { useTransition } from 'react'

interface MoveOutButtonProps {
  action: () => Promise<{ error: string | null }>
}

export function MoveOutButton({ action }: MoveOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('この住民を解除しますか？この操作は取り消せません。')) return
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
      {isPending ? '処理中...' : '住民を解除する'}
    </button>
  )
}
