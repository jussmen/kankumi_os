'use client'

import { useActionState } from 'react'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

interface ExpenseCategory {
  id: string
  name: string
  account_type: AccountType
  is_active: boolean
}

interface ExpenseFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  categories: ExpenseCategory[]
  fiscalYearId: string
  defaultValues?: {
    expense_date?: string
    amount?: number
    category_id?: string
    vendor?: string | null
    description?: string | null
    receipt_url?: string | null
  }
  submitLabel?: string
  cancelHref?: string
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  management: '管理費会計',
  reserve_fund: '修繕積立金会計',
}

export function ExpenseForm({
  action,
  categories,
  fiscalYearId,
  defaultValues,
  submitLabel = '保存',
  cancelHref = '/accounting/expenses',
}: ExpenseFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  const managementCategories = categories.filter(
    (c) => c.account_type === 'management' && c.is_active
  )
  const reserveFundCategories = categories.filter(
    (c) => c.account_type === 'reserve_fund' && c.is_active
  )

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input type="hidden" name="fiscal_year_id" value={fiscalYearId} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          支出日 <span className="text-red-500">*</span>
        </label>
        <input
          name="expense_date"
          type="date"
          required
          defaultValue={defaultValues?.expense_date ?? ''}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          金額 (円) <span className="text-red-500">*</span>
        </label>
        <input
          name="amount"
          type="number"
          required
          min={1}
          step={1}
          defaultValue={defaultValues?.amount ?? ''}
          placeholder="例: 50000"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          科目 <span className="text-red-500">*</span>
        </label>
        <select
          name="category_id"
          required
          defaultValue={defaultValues?.category_id ?? ''}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- 選択してください --</option>
          {managementCategories.length > 0 && (
            <optgroup label={ACCOUNT_TYPE_LABELS['management']}>
              {managementCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {reserveFundCategories.length > 0 && (
            <optgroup label={ACCOUNT_TYPE_LABELS['reserve_fund']}>
              {reserveFundCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          支払先（任意）
        </label>
        <input
          name="vendor"
          type="text"
          defaultValue={defaultValues?.vendor ?? ''}
          placeholder="例: ○○管理会社"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          摘要（任意）
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaultValues?.description ?? ''}
          placeholder="例: 6月分清掃委託費"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          領収書URL（任意）
        </label>
        <input
          name="receipt_url"
          type="url"
          defaultValue={defaultValues?.receipt_url ?? ''}
          placeholder="https://..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '処理中...' : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </a>
      </div>
    </form>
  )
}
