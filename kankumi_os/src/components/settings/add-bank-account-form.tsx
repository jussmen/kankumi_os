'use client'

import { useState, useActionState } from 'react'

const PRESET_OPTIONS = [
  { key: 'resona', label: 'りそな銀行' },
  { key: 'mizuho', label: 'みずほ銀行' },
  { key: 'yokohama-bank', label: '横浜銀行' },
]

interface Props {
  action: (_prevState: string | null, formData: FormData) => Promise<string | null>
}

export function AddBankAccountForm({ action }: Props) {
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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + 口座を追加
      </button>
    )
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 space-y-3 max-w-md"
    >
      <h3 className="text-sm font-semibold text-gray-700">銀行口座を追加</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          銀行 <span className="text-red-500">*</span>
        </label>
        <select
          name="preset_key"
          required
          defaultValue=""
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="" disabled>選択してください</option>
          {PRESET_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          口座ラベル
          <span className="ml-1 text-gray-400 font-normal">（任意・複数口座を区別するための名称）</span>
        </label>
        <input
          name="account_label"
          type="text"
          placeholder="例: 管理費口座"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '登録中...' : '登録'}
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
