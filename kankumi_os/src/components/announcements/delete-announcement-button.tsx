'use client'

import { useTransition } from 'react'

interface DeleteAnnouncementButtonProps {
  action: () => Promise<void>
}

export function DeleteAnnouncementButton({ action }: DeleteAnnouncementButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('このお知らせを削除しますか？')) return
    startTransition(async () => {
      await action()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
