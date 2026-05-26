'use client'

import { useTransition } from 'react'
import { deleteVendorContract } from '@/app/actions/vendors'

interface DeleteVendorContractButtonProps {
  contractId: string
}

export function DeleteVendorContractButton({ contractId }: DeleteVendorContractButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('この契約を削除しますか？')) return
    startTransition(async () => {
      const result = await deleteVendorContract(contractId)
      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
