'use client'

import { useState, useActionState } from 'react'
import { addChecklistItem } from '@/app/actions/checklist'

interface AddChecklistFormProps {
  fiscalYearId: string
}

export function AddChecklistForm({ fiscalYearId }: AddChecklistFormProps) {
  const [isOpen, setIsOpen] = useState(false)

  const boundAction = addChecklistItem.bind(null, fiscalYearId)
  const [error, formAction, isPending] = useActionState(boundAction, null)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + カスタム追加
      </button>
    )
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd)
        if (!error) setIsOpen(false)
      }}
      className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 space-y-3"
    >
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          placeholder="業務項目のタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">予定日</label>
          <input
            name="scheduled_date"
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <input
            name="notes"
            type="text"
            placeholder="備考"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '処理中...' : '追加'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
