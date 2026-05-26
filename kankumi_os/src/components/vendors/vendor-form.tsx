'use client'

import { useActionState, useState } from 'react'
import type { Database } from '@/types/database'

type VendorCategory = Database['public']['Enums']['vendor_category']

type VendorRow = Database['public']['Tables']['vendors']['Row']

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  cleaning: '清掃',
  equipment_maintenance: '設備保守',
  legal_inspection: '法定点検',
  insurance: '保険',
  landscaping: '植栽・外構',
  renovation: '修繕工事',
  security: '警備',
  other: 'その他',
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [VendorCategory, string][]

interface VendorFormProps {
  action: (prev: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: Partial<VendorRow>
  submitLabel?: string
}

export function VendorForm({ action, defaultValues, submitLabel = '保存' }: VendorFormProps) {
  const [category, setCategory] = useState<VendorCategory>(
    (defaultValues?.category as VendorCategory) ?? 'other'
  )
  const [error, formAction, isPending] = useActionState(
    async (prev: string | null, formData: FormData) => action(prev, formData),
    null
  )

  return (
    <form action={formAction} className="space-y-5">
      {/* 業者名 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          業者名 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ''}
          placeholder="例: ABC清掃株式会社"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* カテゴリ */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          カテゴリ
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as VendorCategory)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* カスタムカテゴリ（その他のとき） */}
      {category === 'other' && (
        <div>
          <label htmlFor="custom_category" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ名（その他）
          </label>
          <input
            id="custom_category"
            name="custom_category"
            type="text"
            defaultValue={defaultValues?.custom_category ?? ''}
            placeholder="例: 廃棄物処理"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* 担当者 */}
      <div>
        <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
          担当者名
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          defaultValue={defaultValues?.contact_name ?? ''}
          placeholder="例: 山田 太郎"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 電話番号 */}
      <div>
        <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
          電話番号
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          defaultValue={defaultValues?.contact_phone ?? ''}
          placeholder="例: 03-1234-5678"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* メールアドレス */}
      <div>
        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={defaultValues?.contact_email ?? ''}
          placeholder="例: info@example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          メモ
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="備考や注意事項など"
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
