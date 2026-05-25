'use client'

import { useActionState } from 'react'

interface PaymentProfileFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  submitLabel?: string
}

export function PaymentProfileForm({ action, submitLabel = '登録' }: PaymentProfileFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="transfer_name">
          振込名義
        </label>
        <input
          id="transfer_name"
          name="transfer_name"
          type="text"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例: ヤマダ タロウ"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bank_name">
          銀行名
        </label>
        <input
          id="bank_name"
          name="bank_name"
          type="text"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例: ○○銀行"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '処理中...' : submitLabel}
      </button>
    </form>
  )
}
