'use client'

import { useActionState } from 'react'

interface UnitInviteFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
}

export function UnitInviteForm({ action }: UnitInviteFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
        <input
          name="email"
          type="email"
          required
          placeholder="招待するメールアドレス"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '送信中...' : '招待を送信'}
      </button>
    </form>
  )
}
