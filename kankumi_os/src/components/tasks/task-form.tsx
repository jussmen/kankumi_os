'use client'

import { useActionState } from 'react'

const STATUS_LABELS: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
}

interface TaskFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: {
    title?: string
    due_date?: string | null
    status?: string
    topic_id?: string | null
  }
  showStatus?: boolean
  submitLabel?: string
  cancelHref?: string
}

export function TaskForm({
  action,
  defaultValues,
  showStatus = false,
  submitLabel = '作成',
  cancelHref = '/tasks',
}: TaskFormProps) {
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
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={defaultValues?.title ?? ''}
          placeholder="タスクのタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
          <input
            name="due_date"
            type="date"
            defaultValue={defaultValues?.due_date ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showStatus && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              name="status"
              defaultValue={defaultValues?.status ?? 'todo'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">議題ID（任意）</label>
          <input
            name="topic_id"
            type="text"
            defaultValue={defaultValues?.topic_id ?? ''}
            placeholder="紐づける議題のID"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
