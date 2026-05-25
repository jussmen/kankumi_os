import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/report/print-button'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  management: '管理費会計',
  reserve_fund: '修繕積立金会計',
}

interface PageProps {
  searchParams: Promise<{ fiscal_year_id?: string }>
}

function monthsBetween(startDate: string, endDate: string): string[] {
  const months: string[] = []
  const cur = new Date(startDate)
  cur.setDate(1)
  const last = new Date(endDate)
  last.setDate(1)
  while (cur <= last) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export default async function AuditPage({ searchParams }: PageProps) {
  const { fiscal_year_id } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')
  if (!ALLOWED_ROLES.includes(membership.role)) redirect('/dashboard')

  const { organization_id: orgId } = membership
  const orgName = (membership.organizations as { name: string } | null)?.name ?? ''

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">監査サマリー</h1>
        <NoFiscalYearGuide />
      </div>
    )
  }

  const activeFyId = fiscal_year_id ?? fiscalYears[0].id
  const activeFy = fiscalYears.find((fy) => fy.id === activeFyId) ?? fiscalYears[0]
  const months = monthsBetween(activeFy.start_date, activeFy.end_date)

  const [{ data: expenses }, { data: paymentRecords }, { data: budgets }, { data: categories }] =
    await Promise.all([
      supabase
        .from('expenses')
        .select('amount, expense_categories(name, account_type)')
        .eq('organization_id', orgId)
        .eq('fiscal_year_id', activeFy.id),
      supabase
        .from('payment_records')
        .select('year_month, paid_amount, status')
        .eq('organization_id', orgId)
        .in('year_month', months)
        .in('status', ['confirmed', 'irregular']),
      supabase
        .from('budgets')
        .select('category_id, budgeted_amount')
        .eq('fiscal_year_id', activeFy.id),
      supabase
        .from('expense_categories')
        .select('id, name, account_type')
        .eq('organization_id', orgId)
        .eq('is_active', true),
    ])

  interface ExpenseRow {
    amount: number | string
    expense_categories: { name: string; account_type: string } | null
  }

  const expenseByType = new Map<AccountType, number>()
  const expenseByCategory = new Map<string, number>()
  for (const e of (expenses as ExpenseRow[] | null) ?? []) {
    const at = e.expense_categories?.account_type as AccountType
    const name = e.expense_categories?.name ?? '未分類'
    if (at) expenseByType.set(at, (expenseByType.get(at) ?? 0) + Number(e.amount))
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + Number(e.amount))
  }

  const incomeByMonth = new Map<string, number>()
  for (const r of paymentRecords ?? []) {
    incomeByMonth.set(r.year_month, (incomeByMonth.get(r.year_month) ?? 0) + Number(r.paid_amount))
  }

  const budgetMap = new Map<string, number>(
    (budgets ?? []).map((b) => [b.category_id, Number(b.budgeted_amount)])
  )

  const totalIncome = Array.from(incomeByMonth.values()).reduce((s, v) => s + v, 0)
  const totalExpense = Array.from(expenseByType.values()).reduce((s, v) => s + v, 0)
  const totalBudget = Array.from(budgetMap.values()).reduce((s, v) => s + v, 0)
  const balance = totalIncome - totalExpense

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">監査サマリー</h1>
          <p className="text-sm text-gray-500 mt-1">財務データの読み取り専用ビュー</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {fiscalYears.map((fy) => (
              <Link
                key={fy.id}
                href={`/accounting/audit?fiscal_year_id=${fy.id}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  fy.id === activeFy.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {fy.year}年度
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">{activeFy.year}年度 監査報告サマリー</h1>
        <p className="text-sm text-gray-600">{orgName}</p>
        <p className="text-xs text-gray-500">{activeFy.start_date} 〜 {activeFy.end_date}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="収入合計" value={totalIncome} />
        <SummaryCard label="支出合計" value={totalExpense} />
        <SummaryCard label="予算合計" value={totalBudget} />
        <SummaryCard label="差引残高" value={balance} highlight={true} />
      </div>

      {/* Expense by account type */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-4">
          支出内訳（会計区分別）
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {(['management', 'reserve_fund'] as AccountType[]).map((at) => {
            const amount = expenseByType.get(at) ?? 0
            return (
              <div key={at} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[at]}</p>
                <p className="mt-1 text-xl font-bold text-gray-800">{amount.toLocaleString()}円</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expense categories vs budget */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          科目別実績 vs 予算
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">科目</th>
                <th className="px-4 py-3 text-right font-medium">予算額</th>
                <th className="px-4 py-3 text-right font-medium">実績</th>
                <th className="px-4 py-3 text-right font-medium">差額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(categories ?? []).map((cat) => {
                const budgeted = budgetMap.get(cat.id) ?? 0
                const actual = expenseByCategory.get(cat.name) ?? 0
                const diff = budgeted - actual
                return (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">
                      {cat.name}
                      <span className="ml-2 text-xs text-gray-400">
                        {ACCOUNT_TYPE_LABELS[cat.account_type as AccountType]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {budgeted > 0 ? `${budgeted.toLocaleString()}円` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800 font-medium">
                      {actual > 0 ? `${actual.toLocaleString()}円` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${budgeted > 0 && actual > budgeted ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {budgeted > 0 ? `${diff.toLocaleString()}円` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income by month */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          月別入金実績
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">年月</th>
                <th className="px-4 py-3 text-right font-medium">入金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {months.map((ym) => {
                const amount = incomeByMonth.get(ym) ?? 0
                return (
                  <tr key={ym} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{ym.replace('-', '/')}</td>
                    <td className="px-4 py-2.5 text-right text-gray-800">
                      {amount > 0 ? `${amount.toLocaleString()}円` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2.5 text-gray-800">合計</td>
                <td className="px-4 py-2.5 text-right text-gray-900">{totalIncome.toLocaleString()}円</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-right">
        出力日: {new Date().toLocaleDateString('ja-JP')}
      </p>
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

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  const isNegative = value < 0
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${isNegative ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value.toLocaleString()}円
      </p>
    </div>
  )
}
