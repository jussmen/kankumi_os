'use client'

import { useTransition, useState } from 'react'
import { resendInvite } from '@/app/actions/members'

export function ResendInviteButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  function handleClick() {
    startTransition(async () => {
      const error = await resendInvite(memberId)
      if (!error) setSent(true)
    })
  }

  if (sent) {
    return <span className="text-xs text-green-600 px-2 py-1">送信しました</span>
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? '送信中...' : 'メール再送'}
    </button>
  )
}
