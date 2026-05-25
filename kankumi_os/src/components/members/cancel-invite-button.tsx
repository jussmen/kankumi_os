'use client'

import { useTransition } from 'react'
import { cancelInvite } from '@/app/actions/members'

export function CancelInviteButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('招待を取り消しますか？')) return
    startTransition(() => {
      cancelInvite(memberId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? '処理中...' : '取り消す'}
    </button>
  )
}
