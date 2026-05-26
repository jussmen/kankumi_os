'use client'

import { useActionState } from 'react'
import type { Database } from '@/types/database'

type TopicStatus = Database['public']['Enums']['topic_status']
type TopicType = Database['public']['Enums']['topic_type']
type Priority = Database['public']['Enums']['priority']
type Visibility = Database['public']['Enums']['visibility']

const TYPE_LABELS: Record<TopicType, string> = {
  board_meeting: '理事会',
  general: '一般',
  issue: '課題',
  notice: '告知',
  task: 'タスク',
}

const STATUS_LABELS: Record<TopicStatus, string> = {
  open: '未着手',
  in_progress: '進行中',
  resolved: '解決済み',
  closed: 'クローズ',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  normal: '通常',
  high: '高',
  urgent: '緊急',
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  board_only: '理事のみ',
  all_members: '全住民',
}

interface TopicFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: {
    title?: string
    body?: string
    type?: TopicType
    status?: TopicStatus
    priority?: Priority
    visibility?: Visibility
    due_date?: string | null
    resolution?: string | null
  }
  showStatus?: boolean
  submitLabel?: string
  cancelHref?: string
}

export function TopicForm({
  action,
  defaultValues,
  showStatus = false,
  submitLabel = '作成',
  cancelHref = '/topics',
}: TopicFormProps) {
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
          placeholder="議題のタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
        <textarea
          name="body"
          rows={8}
          defaultValue={defaultValues?.body ?? ''}
          placeholder="Markdown形式で記述できます"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? 'general'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.entries(TYPE_LABELS) as [TopicType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
          <select
            name="priority"
            defaultValue={defaultValues?.priority ?? 'normal'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {showStatus && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              name="status"
              defaultValue={defaultValues?.status ?? 'open'}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.entries(STATUS_LABELS) as [TopicStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公開範囲</label>
          <select
            name="visibility"
            defaultValue={defaultValues?.visibility ?? 'board_only'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.entries(VISIBILITY_LABELS) as [Visibility, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
          <input
            name="due_date"
            type="date"
            defaultValue={defaultValues?.due_date ?? ''}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {showStatus && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            決定内容・理由（任意）
          </label>
          <textarea
            name="resolution"
            rows={4}
            defaultValue={defaultValues?.resolution ?? ''}
            placeholder="解決済み・クローズ時の決定内容や理由"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      )}

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
