'use client'

import { useState, useActionState } from 'react'

interface Props {
  action: (_prevState: string | null, formData: FormData) => Promise<string | null>
}

export function AddTemplateForm({ action }: Props) {
  const [open, setOpen] = useState(false)
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, fd: FormData) => {
      const result = await action(_prev, fd)
      if (!result) setOpen(false)
      return result
    },
    null
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-600 hover:bg-blue-100 transition-colors w-full text-center"
      >
        + テンプレートを追加
      </button>
    )
  }

  return (
    <form action={formAction} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 space-y-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            name="label"
            type="text"
            required
            placeholder="例: 設備点検"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              年間回数
            </label>
            <div className="flex items-center gap-1.5">
              <input
                name="count"
                type="number"
                min={1}
                max={52}
                defaultValue={1}
                className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">回</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ</label>
            <input
              name="notes"
              type="text"
              placeholder="備考（任意）"
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '保存中...' : '追加'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  )
}
