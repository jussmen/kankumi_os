'use client'

import { useTransition } from 'react'
import { removeMember } from '@/app/actions/members'

interface RemoveMemberButtonProps {
  memberId: string
}

export function RemoveMemberButton({ memberId }: RemoveMemberButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('このメンバーを削除しますか？')) return
    startTransition(() => {
      removeMember(memberId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? '処理中...' : '削除'}
    </button>
  )
}
