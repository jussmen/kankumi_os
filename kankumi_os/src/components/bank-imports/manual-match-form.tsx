'use client'

import { useState, useTransition } from 'react'
import { manualMatchTransaction } from '@/app/actions/bank-imports'

interface Unit {
  id: string
  unit_number: string
}

interface Props {
  txId: string
  defaultYearMonth: string
  units: Unit[]
}

export function ManualMatchForm({ txId, defaultYearMonth, units }: Props) {
  const [open, setOpen] = useState(false)
  const [unitId, setUnitId] = useState(units[0]?.id ?? '')
  const [yearMonth, setYearMonth] = useState(defaultYearMonth)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        照合
      </button>
    )
  }

  function handleSubmit() {
    if (!unitId || !yearMonth) return
    setError(null)
    startTransition(async () => {
      const res = await manualMatchTransaction(txId, unitId, yearMonth)
      if (res.error) {
        setError(res.error)
      } else {
        setOpen(false)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <select
          value={unitId}
          onChange={e => setUnitId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.unit_number}</option>
          ))}
        </select>
        <input
          type="month"
          value={yearMonth}
          onChange={e => setYearMonth(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '...' : '照合'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null) }}
          className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
