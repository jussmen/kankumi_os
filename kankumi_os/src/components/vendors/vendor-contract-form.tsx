'use client'

import { useActionState } from 'react'
import type { Database } from '@/types/database'

type ContractRow = Database['public']['Tables']['vendor_contracts']['Row']

const COST_CYCLE_LABELS: Record<string, string> = {
  monthly: '月額',
  yearly: '年額',
  one_time: '一括',
}

interface VendorContractFormProps {
  action: (prev: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: Partial<ContractRow>
  submitLabel?: string
  onSuccess?: () => void
}

export function VendorContractForm({
  action,
  defaultValues,
  submitLabel = '保存',
  onSuccess,
}: VendorContractFormProps) {
  const [error, formAction, isPending] = useActionState(
    async (prev: string | null, formData: FormData) => {
      const result = await action(prev, formData)
      if (!result && onSuccess) onSuccess()
      return result
    },
    null
  )

  return (
    <form action={formAction} className="space-y-4">
      {/* 業者ID（更新時） */}
      {defaultValues?.vendor_id && (
        <input type="hidden" name="vendor_id" value={defaultValues.vendor_id} />
      )}

      {/* サービス内容 */}
      <div>
        <label htmlFor="service_description" className="block text-sm font-medium text-gray-700 mb-1">
          サービス内容 <span className="text-red-500">*</span>
        </label>
        <input
          id="service_description"
          name="service_description"
          type="text"
          required
          defaultValue={defaultValues?.service_description ?? ''}
          placeholder="例: 共用部清掃"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 契約期間 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            開始日
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultValues?.start_date ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            終了日
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 更新日 */}
      <div>
        <label htmlFor="renewal_date" className="block text-sm font-medium text-gray-700 mb-1">
          更新日
        </label>
        <input
          id="renewal_date"
          name="renewal_date"
          type="date"
          defaultValue={defaultValues?.renewal_date ?? ''}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 自動更新 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">自動更新</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="auto_renewal"
              value="true"
              defaultChecked={defaultValues?.auto_renewal === true}
              className="accent-blue-600"
            />
            あり
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="auto_renewal"
              value="false"
              defaultChecked={defaultValues?.auto_renewal !== true}
              className="accent-blue-600"
            />
            なし
          </label>
        </div>
      </div>

      {/* 費用 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cost_amount" className="block text-sm font-medium text-gray-700 mb-1">
            費用（円）
          </label>
          <input
            id="cost_amount"
            name="cost_amount"
            type="number"
            min="0"
            step="1"
            defaultValue={defaultValues?.cost_amount ?? ''}
            placeholder="例: 50000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="cost_cycle" className="block text-sm font-medium text-gray-700 mb-1">
            支払いサイクル
          </label>
          <select
            id="cost_cycle"
            name="cost_cycle"
            defaultValue={defaultValues?.cost_cycle ?? 'monthly'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(COST_CYCLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          メモ
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="備考や特記事項など"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '保存中...' : submitLabel}
      </button>
    </form>
  )
}
