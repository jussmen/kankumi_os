'use client'

import { useActionState } from 'react'
import { createFiscalYear } from '@/app/actions/checklist'

export function FiscalYearForm() {
  const [error, formAction, isPending] = useActionState(createFiscalYear, null)

  const currentYear = new Date().getFullYear()

  return (
    <form action={formAction} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          年度 <span className="text-red-500">*</span>
        </label>
        <input
          name="year"
          type="number"
          required
          defaultValue={currentYear}
          min={2000}
          max={2100}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          開始日 <span className="text-red-500">*</span>
        </label>
        <input
          name="start_date"
          type="date"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          終了日 <span className="text-red-500">*</span>
        </label>
        <input
          name="end_date"
          type="date"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '処理中...' : '作成'}
        </button>
        <a
          href="/checklist"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </a>
      </div>
    </form>
  )
}
