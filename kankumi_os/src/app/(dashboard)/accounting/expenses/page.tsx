import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  management: '管理費会計',
  reserve_fund: '修繕積立金会計',
}

interface PageProps {
  searchParams: Promise<{ fiscal_year_id?: string; category_id?: string }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const { fiscal_year_id, category_id } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  const { orgId, role } = { orgId: membership.organization_id, role: membership.role }
  const canEdit = ['admin', 'vice_president', 'treasurer'].includes(role)

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">支出管理</h1>
        <NoFiscalYearGuide />
      </div>
    )
  }

  const activeFiscalYear = fiscalYears.find((fy) => fy.status === 'active') ?? fiscalYears[0]
  const selectedFiscalYearId = fiscal_year_id ?? activeFiscalYear.id
  const selectedFiscalYear = fiscalYears.find((fy) => fy.id === selectedFiscalYearId) ?? activeFiscalYear

  let expensesQuery = supabase
    .from('expenses')
    .select('id, expense_date, amount, description, vendor, category_id, expense_categories(name, account_type)')
    .eq('organization_id', orgId)
    .eq('fiscal_year_id', selectedFiscalYearId)
    .order('expense_date', { ascending: false })

  if (category_id) {
    expensesQuery = expensesQuery.eq('category_id', category_id)
  }

  const { data: expenses } = await expensesQuery

  const managementTotal = (expenses ?? [])
    .filter((e) => {
      const cat = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories
      return cat?.account_type === 'management'
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const reserveFundTotal = (expenses ?? [])
    .filter((e) => {
      const cat = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories
      return cat?.account_type === 'reserve_fund'
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const grandTotal = managementTotal + reserveFundTotal

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">支出管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">支出の登録・確認</p>
        </div>
        {canEdit && (
          <Link
            href={`/accounting/expenses/new?fiscal_year_id=${selectedFiscalYearId}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + 支出登録
          </Link>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4">
        <Link href="/accounting/expenses" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1">支出管理</Link>
        <Link href="/accounting/budget" className="text-sm text-gray-500 hover:text-gray-700 pb-1">予算管理</Link>
        <Link href="/accounting/annual" className="text-sm text-gray-500 hover:text-gray-700 pb-1">年間照合</Link>
        <Link href="/accounting/audit" className="text-sm text-gray-500 hover:text-gray-700 pb-1">監査</Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">会計年度:</label>
        <div className="flex gap-2 flex-wrap">
          {fiscalYears.map((fy) => (
            <Link
              key={fy.id}
              href={`/accounting/expenses?fiscal_year_id=${fy.id}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                fy.id === selectedFiscalYearId
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {fy.year}年度
              {fy.status === 'active' && (
                <span className="ml-1 text-xs opacity-75">(進行中)</span>
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">合計支出</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">
            ¥{grandTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {ACCOUNT_TYPE_LABELS['management']}
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            ¥{managementTotal.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {ACCOUNT_TYPE_LABELS['reserve_fund']}
          </p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            ¥{reserveFundTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {(expenses ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">
            {selectedFiscalYear.year}年度の支出データがありません。
          </p>
          {canEdit && (
            <Link
              href={`/accounting/expenses/new?fiscal_year_id=${selectedFiscalYearId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              支出を登録する
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">日付</th>
                <th className="px-4 py-3 text-left font-medium">科目</th>
                <th className="px-4 py-3 text-right font-medium">金額</th>
                <th className="px-4 py-3 text-left font-medium">支払先</th>
                <th className="px-4 py-3 text-left font-medium">摘要</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(expenses ?? []).map((expense) => {
                const cat = Array.isArray(expense.expense_categories)
                  ? expense.expense_categories[0]
                  : expense.expense_categories
                return (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <Link
                        href={`/accounting/expenses/${expense.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {expense.expense_date}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {cat ? (
                        <span>
                          <span className="text-gray-400 text-xs mr-1">
                            [{ACCOUNT_TYPE_LABELS[cat.account_type as AccountType]}]
                          </span>
                          {cat.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                      ¥{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{expense.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {expense.description ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NoFiscalYearGuide() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-8 py-12 text-center max-w-lg">
      <p className="text-base font-medium text-gray-800 mb-2">会計年度が設定されていません</p>
      <p className="text-sm text-gray-500 mb-6">
        会計年度を設定すると、支出管理・予算管理・収支報告書などの会計機能が使えます。
      </p>
      <Link
        href="/checklist/new-fiscal-year"
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        会計年度を設定する
      </Link>
    </div>
  )
}
