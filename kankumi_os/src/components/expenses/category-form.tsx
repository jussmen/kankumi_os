'use client'

import { useActionState } from 'react'

interface CategoryFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
}

export function CategoryForm({ action }: CategoryFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          科目名 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="例: 清掃委託費"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          会計区分 <span className="text-red-500">*</span>
        </label>
        <select
          name="account_type"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">選択してください</option>
          <option value="management">管理費会計</option>
          <option value="reserve_fund">修繕積立金会計</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '追加中...' : '追加'}
      </button>
    </form>
  )
}
