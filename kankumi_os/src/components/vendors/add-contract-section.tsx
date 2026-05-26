'use client'

import { useState } from 'react'
import { VendorContractForm } from './vendor-contract-form'

interface AddContractSectionProps {
  action: (prev: string | null, formData: FormData) => Promise<string | null>
}

export function AddContractSection({ action }: AddContractSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        + 契約を追加
      </button>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">新しい契約を追加</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </button>
      </div>
      <VendorContractForm
        action={action}
        submitLabel="契約を追加"
        onSuccess={() => setIsOpen(false)}
      />
    </div>
  )
}
