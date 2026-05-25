'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { updateChargeTypes } from '@/app/actions/charge-types'

interface ChargeTypeData {
  type: string
  alias_name: string | null
  is_active: boolean
}

interface ChargeTypesFormProps {
  chargeTypes: ChargeTypeData[]
}

const OPTIONAL_TYPES = ['common_fee', 'parking', 'bike_parking', 'other'] as const
type OptionalType = (typeof OPTIONAL_TYPES)[number]

const OPTIONAL_LABELS: Record<OptionalType, string> = {
  common_fee: '共益費',
  parking: '駐車場使用料',
  bike_parking: '自転車・バイク置き場使用料',
  other: 'その他',
}

export function ChargeTypesForm({ chargeTypes }: ChargeTypesFormProps) {
  const activeMap = new Map(
    chargeTypes.filter((ct) => ct.is_active).map((ct) => [ct.type, ct])
  )

  const [checked, setChecked] = useState<Record<OptionalType, boolean>>(
    Object.fromEntries(OPTIONAL_TYPES.map((t) => [t, activeMap.has(t)])) as Record<OptionalType, boolean>
  )
  const [otherAlias, setOtherAlias] = useState(activeMap.get('other')?.alias_name ?? '')

  const [error, dispatch, isPending] = useActionState(updateChargeTypes, null)
  const [saved, setSaved] = useState(false)
  const prevPendingRef = useRef(false)

  useEffect(() => {
    if (prevPendingRef.current && !isPending && error === null) {
      setSaved(true)
      const timer = setTimeout(() => setSaved(false), 3000)
      return () => clearTimeout(timer)
    }
    prevPendingRef.current = isPending
  }, [isPending, error])

  return (
    <form action={dispatch} className="space-y-6">
      {/* 必須項目 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">必須項目</p>
        <div className="space-y-2">
          {(['management_fee', 'reserve_fund'] as const).map((type) => (
            <label
              key={type}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-not-allowed"
            >
              <input
                type="checkbox"
                checked
                disabled
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                {type === 'management_fee' ? '管理費' : '修繕積立金'}
                <span className="ml-2 text-xs text-gray-400 font-normal">（必須）</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 任意項目 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">任意項目</p>
        <div className="space-y-2">
          {OPTIONAL_TYPES.map((type) => (
            <div key={type}>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  name={`charge_type_${type}`}
                  value="on"
                  checked={checked[type]}
                  onChange={(e) => setChecked({ ...checked, [type]: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">{OPTIONAL_LABELS[type]}</span>
              </label>
              {type === 'other' && checked[type] && (
                <div className="mt-2 ml-10">
                  <input
                    type="text"
                    name="charge_type_other_alias"
                    value={otherAlias}
                    onChange={(e) => setOtherAlias(e.target.value)}
                    placeholder="項目名を入力（例：専用庭使用料）"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          保存しました。
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '保存中...' : '保存する'}
      </button>
    </form>
  )
}
