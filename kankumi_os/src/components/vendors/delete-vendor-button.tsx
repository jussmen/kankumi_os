'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteVendor } from '@/app/actions/vendors'

interface DeleteVendorButtonProps {
  vendorId: string
}

export function DeleteVendorButton({ vendorId }: DeleteVendorButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm('この業者を削除しますか？関連する契約もすべて削除されます。')) return
    startTransition(async () => {
      const result = await deleteVendor(vendorId)
      if (result.error) {
        alert(result.error)
      } else {
        router.push('/settings/vendors')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md px-3 py-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending ? '削除中...' : '業者を削除'}
    </button>
  )
}
