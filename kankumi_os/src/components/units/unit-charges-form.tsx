'use client'

import { useState, useTransition } from 'react'
import { upsertUnitCharge } from '@/app/actions/units'

const CHARGE_TYPE_LABELS: Record<string, string> = {
  management_fee: '管理費',
  reserve_fund: '修繕積立金',
  common_fee: '共益費',
  parking: '駐車場',
  bike_parking: '駐輪場',
  other: 'その他',
}

interface ChargeType {
  id: string
  type: string
  alias_name: string | null
}

interface UnitCharge {
  id: string
  charge_type_id: string
  amount: number
  effective_from: string
}

interface UnitChargesFormProps {
  unitId: string
  chargeTypes: ChargeType[]
  currentCharges: UnitCharge[]
}

export function UnitChargesForm({
  unitId,
  chargeTypes,
  currentCharges,
}: UnitChargesFormProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 7) + '-01'
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentChargeMap = new Map(currentCharges.map((c) => [c.charge_type_id, c]))

  function startEdit(chargeTypeId: string) {
    const existing = currentChargeMap.get(chargeTypeId)
    setAmount(existing?.amount?.toString() ?? '')
    setEffectiveFrom(new Date().toISOString().slice(0, 7) + '-01')
    setEditingId(chargeTypeId)
    setError(null)
  }

  function handleSave(chargeTypeId: string) {
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      setError('金額を正しく入力してください。')
      return
    }

    startTransition(async () => {
      const result = await upsertUnitCharge(unitId, chargeTypeId, amountNum, effectiveFrom)
      if (result.error) {
        setError(result.error)
      } else {
        setEditingId(null)
        setError(null)
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {chargeTypes.map((ct) => {
        const label = ct.alias_name ?? CHARGE_TYPE_LABELS[ct.type] ?? ct.type
        const current = currentChargeMap.get(ct.id)
        const isEditing = editingId === ct.id

        return (
          <div key={ct.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
            <span className="w-36 text-sm text-gray-700">{label}</span>

            {isEditing ? (
              <>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="例: 10000"
                  min={0}
                  className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">円/月</span>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleSave(ct.id)}
                  disabled={isPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? '...' : '保存'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-900 w-28 text-right">
                  {current ? `${current.amount.toLocaleString()}円` : '—'}
                </span>
                <span className="text-sm text-gray-400 flex-1">
                  {current ? `/月 (${current.effective_from}〜)` : '未設定'}
                </span>
                <button
                  onClick={() => startEdit(ct.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {current ? '変更' : '設定'}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
