'use client'

import { useActionState } from 'react'
import { manualMatch } from '@/app/actions/matching'

interface Unit {
  id: string
  unit_number: string
}

interface ManualMatchFormProps {
  transactionId: string
  yearMonth: string
  units: Unit[]
}

export function ManualMatchForm({ transactionId, yearMonth, units }: ManualMatchFormProps) {
  const action = manualMatch.bind(null, transactionId, yearMonth)
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="flex items-center gap-3 flex-wrap">
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      <select
        name="unit_id"
        required
        defaultValue=""
        className="flex-1 min-w-[160px] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="" disabled>
          部屋番号を選択...
        </option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.unit_number}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {isPending ? '照合中...' : '照合する'}
      </button>
    </form>
  )
}
