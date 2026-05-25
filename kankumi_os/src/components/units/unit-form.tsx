'use client'

import { useActionState } from 'react'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']

const OCCUPANCY_LABELS: Record<OccupancyStatus, string> = {
  occupied: '居住中',
  vacant: '空室',
  excluded: '対象外',
}

interface UnitFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: {
    unit_number?: string
    occupancy_status?: OccupancyStatus
  }
  submitLabel?: string
  cancelHref?: string
}

export function UnitForm({
  action,
  defaultValues,
  submitLabel = '保存',
  cancelHref = '/units',
}: UnitFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          部屋番号 <span className="text-red-500">*</span>
        </label>
        <input
          name="unit_number"
          type="text"
          required
          defaultValue={defaultValues?.unit_number ?? ''}
          placeholder="例: 101"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">入居状態</label>
        <select
          name="occupancy_status"
          defaultValue={defaultValues?.occupancy_status ?? 'occupied'}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.entries(OCCUPANCY_LABELS) as [OccupancyStatus, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            )
          )}
        </select>
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
