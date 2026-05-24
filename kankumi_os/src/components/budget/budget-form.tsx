'use client'

import { useActionState } from 'react'
import { upsertBudget } from '@/app/actions/budget'

interface CategoryRow {
  id: string
  name: string
  accountType: string
  budgeted: number
  actual: number
}

interface BudgetFormProps {
  fiscalYearId: string
  categories: CategoryRow[]
  accountTypes: string[]
  accountTypeLabels: Record<string, string>
  canEdit: boolean
}

export function BudgetForm({
  fiscalYearId,
  categories,
  accountTypes,
  accountTypeLabels,
  canEdit,
}: BudgetFormProps) {
  const action = upsertBudget.bind(null, fiscalYearId)
  const [error, formAction, isPending] = useActionState(action, null)

  const totalBudgeted = categories.reduce((s, c) => s + c.budgeted, 0)
  const totalActual = categories.reduce((s, c) => s + c.actual, 0)

  return (
    <form action={formAction} className="space-y-8">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      {accountTypes.map((at) => {
        const rows = categories.filter((c) => c.accountType === at)
        if (rows.length === 0) return null
        const subtotalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0)
        const subtotalActual = rows.reduce((s, r) => s + r.actual, 0)
        return (
          <div key={at}>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              {accountTypeLabels[at] ?? at}
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">科目</th>
                    <th className="px-4 py-3 text-right font-medium w-40">予算額</th>
                    <th className="px-4 py-3 text-right font-medium w-36">実績</th>
                    <th className="px-4 py-3 text-right font-medium w-36">差額</th>
                    <th className="px-4 py-3 text-center font-medium w-20">進捗</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const diff = row.budgeted - row.actual
                    const pct = row.budgeted > 0 ? Math.min(100, Math.round((row.actual / row.budgeted) * 100)) : null
                    const isOver = row.budgeted > 0 && row.actual > row.budgeted
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-800">{row.name}</td>
                        <td className="px-4 py-2.5 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              name={`budget_${row.id}`}
                              defaultValue={row.budgeted || ''}
                              min="0"
                              step="1"
                              placeholder="0"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-700">
                              {row.budgeted > 0 ? `${row.budgeted.toLocaleString()}円` : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">
                          {row.actual > 0 ? `${row.actual.toLocaleString()}円` : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-medium ${row.budgeted === 0 ? 'text-gray-400' : isOver ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.budgeted === 0
                            ? '—'
                            : `${diff >= 0 ? '' : ''}${diff.toLocaleString()}円`}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {pct !== null ? (
                            <span className={`text-xs font-medium ${isOver ? 'text-red-600' : pct >= 80 ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50 font-semibold">
                    <td className="px-4 py-2.5 text-gray-800">小計</td>
                    <td className="px-4 py-2.5 text-right text-gray-800">
                      {subtotalBudgeted > 0 ? `${subtotalBudgeted.toLocaleString()}円` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800">
                      {subtotalActual > 0 ? `${subtotalActual.toLocaleString()}円` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${subtotalActual > subtotalBudgeted && subtotalBudgeted > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {subtotalBudgeted > 0
                        ? `${(subtotalBudgeted - subtotalActual).toLocaleString()}円`
                        : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}

      <div className="bg-gray-50 rounded-lg border border-gray-200 px-5 py-3 flex items-center justify-between">
        <div className="flex gap-8 text-sm">
          <span>
            <span className="text-gray-500">予算合計: </span>
            <span className="font-semibold text-gray-800">{totalBudgeted.toLocaleString()}円</span>
          </span>
          <span>
            <span className="text-gray-500">実績合計: </span>
            <span className="font-semibold text-gray-800">{totalActual.toLocaleString()}円</span>
          </span>
          <span>
            <span className="text-gray-500">残余: </span>
            <span className={`font-semibold ${totalActual > totalBudgeted && totalBudgeted > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {totalBudgeted > 0 ? `${(totalBudgeted - totalActual).toLocaleString()}円` : '—'}
            </span>
          </span>
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '保存中...' : '予算を保存'}
          </button>
        )}
      </div>
    </form>
  )
}
