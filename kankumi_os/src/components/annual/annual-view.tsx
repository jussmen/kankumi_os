'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { computeAnnualAccumulation } from '@/app/actions/annual'
import type { AnnualAccumulationResult } from '@/app/actions/annual'

interface FiscalYear {
  id: string
  year: number
  start_date: string
  end_date: string
  status: string
}

interface AnnualViewProps {
  fiscalYears: FiscalYear[]
  defaultFiscalYearId: string
  canWrite: boolean
}

export function AnnualView({ fiscalYears, defaultFiscalYearId, canWrite }: AnnualViewProps) {
  const [selectedId, setSelectedId] = useState(defaultFiscalYearId)
  const action = computeAnnualAccumulation.bind(null, selectedId)
  const [result, formAction, isPending] = useActionState<AnnualAccumulationResult | null, FormData>(
    action,
    null
  )

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">会計年度</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.year}年度（{fy.start_date} 〜 {fy.end_date}）
                {fy.status === 'closed' ? ' [締済]' : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending || !selectedId}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '集計中...' : '年間照合実行'}
        </button>
      </form>

      {result?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {result.error}
        </p>
      )}

      {result && !result.error && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="対象期間"
              value={`${result.startDate} 〜 ${result.endDate}`}
              small
            />
            <StatCard label="期待収入合計" value={`${result.totalExpected.toLocaleString()}円`} small />
            <StatCard label="実収入合計" value={`${result.totalActual.toLocaleString()}円`} small />
            <StatCard
              label="年間照合で確定"
              value={`${result.updatedToConfirmed}件`}
              highlight={result.updatedToConfirmed > 0}
              small
            />
          </div>

          {result.updatedToConfirmed > 0 && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
              {result.updatedToConfirmed}件の「差異あり」レコードを年間累計一致により「入金確認」に更新しました。
            </p>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">部屋番号</th>
                  <th className="px-4 py-3 text-right font-medium">期待年間額</th>
                  <th className="px-4 py-3 text-right font-medium">実入金額</th>
                  <th className="px-4 py-3 text-right font-medium">差額</th>
                  <th className="px-4 py-3 text-center font-medium">判定</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.rows.map((row) => {
                  const isMatch = row.diff === 0
                  const isOver = row.diff > 0
                  return (
                    <tr key={row.unitId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/units/${row.unitId}`}
                          className="font-medium text-gray-800 hover:text-blue-600 transition-colors"
                        >
                          {row.unitNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {row.expectedTotal > 0 ? `${row.expectedTotal.toLocaleString()}円` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-800 font-medium">
                        {row.actualTotal > 0 ? `${row.actualTotal.toLocaleString()}円` : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${isMatch ? 'text-gray-400' : isOver ? 'text-blue-600' : 'text-red-600'}`}>
                        {row.expectedTotal === 0
                          ? '—'
                          : isMatch
                          ? '±0'
                          : `${row.diff > 0 ? '+' : ''}${row.diff.toLocaleString()}円`}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.expectedTotal === 0 ? (
                          <span className="text-xs text-gray-400">設定なし</span>
                        ) : isMatch ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            一致
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                            差異
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  small,
  highlight,
}: {
  label: string
  value: string
  small?: boolean
  highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 font-bold ${small ? 'text-sm' : 'text-2xl'} ${highlight ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  )
}
