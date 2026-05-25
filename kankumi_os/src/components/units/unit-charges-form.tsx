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

const REQUIRED_TYPE_ENUMS = ['management_fee', 'reserve_fund']

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
  is_not_applicable: boolean
}

interface UnitChargesFormProps {
  unitId: string
  chargeTypes: ChargeType[]
  currentCharges: UnitCharge[]
  hasResident?: boolean
}

export function UnitChargesForm({ unitId, chargeTypes, currentCharges, hasResident = false }: UnitChargesFormProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [notApplicable, setNotApplicable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const currentChargeMap = new Map(currentCharges.map((c) => [c.charge_type_id, c]))

  function startEdit(chargeTypeId: string, isOptional: boolean) {
    const existing = currentChargeMap.get(chargeTypeId)
    if (existing) {
      setNotApplicable(existing.is_not_applicable)
      setAmount(existing.is_not_applicable ? '' : existing.amount.toString())
    } else {
      setNotApplicable(isOptional)
      setAmount('')
    }
    setEditingId(chargeTypeId)
    setError(null)
  }

  function handleSave(chargeTypeId: string) {
    const existing = currentChargeMap.get(chargeTypeId)
    // 既存の料金があり、かつ居住者がいる場合は確認ダイアログを表示
    if (existing && hasResident) {
      setConfirmingId(chargeTypeId)
      return
    }
    executeSave(chargeTypeId)
  }

  function executeSave(chargeTypeId: string) {
    setConfirmingId(null)
    if (!notApplicable) {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('金額を正しく入力してください。')
        return
      }
      startTransition(async () => {
        const result = await upsertUnitCharge(unitId, chargeTypeId, amountNum, false)
        if (result.error) { setError(result.error) } else { setEditingId(null); setError(null) }
      })
    } else {
      startTransition(async () => {
        const result = await upsertUnitCharge(unitId, chargeTypeId, 0, true)
        if (result.error) { setError(result.error) } else { setEditingId(null); setError(null) }
      })
    }
  }

  return (
    <div className="space-y-1">
      {error && (
        <p className="mb-2 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
      )}
      {confirmingId && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800 mb-2">
            変更すると、住民の確認が得られるまで自動入金確認の対象外となります。本当に変更を保存しますか？
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => executeSave(confirmingId)}
              disabled={isPending}
              className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              保存する
            </button>
            <button
              onClick={() => setConfirmingId(null)}
              className="rounded border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      {chargeTypes.map((ct) => {
        const isOptional = !REQUIRED_TYPE_ENUMS.includes(ct.type)
        const label = ct.alias_name ?? CHARGE_TYPE_LABELS[ct.type] ?? ct.type
        const current = currentChargeMap.get(ct.id)
        const isEditing = editingId === ct.id

        return (
          <div key={ct.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
            {/* 項目名 */}
            <span className="w-40 text-sm text-gray-700 shrink-0">
              {label}
              {!isOptional && <span className="ml-1 text-xs text-gray-400">必須</span>}
            </span>

            {isEditing ? (
              <div className="flex items-center gap-2 flex-wrap">
                {isOptional && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notApplicable}
                      onChange={(e) => {
                        setNotApplicable(e.target.checked)
                        if (e.target.checked) setAmount('')
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    利用なし
                  </label>
                )}
                {!notApplicable && (
                  <>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="例: 10000"
                      min={1}
                      autoFocus={!isOptional}
                      className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500 shrink-0">円/月</span>
                  </>
                )}
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
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {current
                    ? current.is_not_applicable
                      ? <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">利用なし</span>
                      : `${current.amount.toLocaleString()}円/月`
                    : <span className="text-gray-400">未設定</span>
                  }
                </span>
                <button
                  onClick={() => startEdit(ct.id, isOptional)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors shrink-0"
                >
                  {current ? '変更' : '設定'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
