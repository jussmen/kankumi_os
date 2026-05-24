'use client'

import { useActionState } from 'react'
import type { Database } from '@/types/database'

type Visibility = Database['public']['Enums']['visibility']

const VISIBILITY_LABELS: Record<Visibility, string> = {
  board_only: '理事のみ',
  all_members: '全住民',
}

interface AnnouncementFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  defaultValues?: {
    title?: string
    body?: string
    visibility?: Visibility
    published_at?: string | null
    expires_at?: string | null
  }
  submitLabel?: string
  cancelHref?: string
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export function AnnouncementForm({
  action,
  defaultValues,
  submitLabel = '作成',
  cancelHref = '/announcements',
}: AnnouncementFormProps) {
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
          placeholder="お知らせのタイトル"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
        <textarea
          name="body"
          rows={8}
          defaultValue={defaultValues?.body ?? ''}
          placeholder="お知らせの内容を入力してください"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公開範囲</label>
          <select
            name="visibility"
            defaultValue={defaultValues?.visibility ?? 'all_members'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.entries(VISIBILITY_LABELS) as [Visibility, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">公開日時</label>
          <input
            name="published_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.published_at)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">掲載終了日時（任意）</label>
          <input
            name="expires_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(defaultValues?.expires_at)}
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
