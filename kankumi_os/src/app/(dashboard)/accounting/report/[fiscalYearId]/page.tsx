import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/report/print-button'

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

interface PageProps {
  params: Promise<{ fiscalYearId: string }>
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

export default async function AnnualReportPage({ params }: PageProps) {
  const { fiscalYearId } = await params

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

  const { data: fy } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('id', fiscalYearId)
    .eq('organization_id', orgId)
    .single()

  if (!fy) redirect('/accounting/report')

  const months = monthsBetween(fy.start_date, fy.end_date)

  const [{ data: expenses }, { data: paymentRecords }] = await Promise.all([
    supabase
      .from('expenses')
      .select('expense_date, amount, vendor, description, expense_categories(name, account_type)')
      .eq('organization_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('expense_date'),
    supabase
      .from('payment_records')
      .select('year_month, paid_amount, status')
      .eq('organization_id', orgId)
      .in('year_month', months)
      .in('status', ['confirmed', 'irregular']),
  ])

  // Group expenses by account_type → category
  interface ExpenseRow {
    expense_date: string
    amount: number | string
    vendor: string | null
    description: string | null
    expense_categories: { name: string; account_type: string } | null
  }

  const managementExpenses = (expenses as ExpenseRow[] | null ?? []).filter(
    (e) => e.expense_categories?.account_type === 'management'
  )
  const reserveExpenses = (expenses as ExpenseRow[] | null ?? []).filter(
    (e) => e.expense_categories?.account_type === 'reserve_fund'
  )

  function groupByCategory(rows: ExpenseRow[]) {
    const map = new Map<string, number>()
    for (const e of rows) {
      const name = e.expense_categories?.name ?? '未分類'
      map.set(name, (map.get(name) ?? 0) + Number(e.amount))
    }
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }))
  }

  const managementByCategory = groupByCategory(managementExpenses)
  const reserveByCategory = groupByCategory(reserveExpenses)

  const managementTotal = managementByCategory.reduce((s, r) => s + r.total, 0)
  const reserveTotal = reserveByCategory.reduce((s, r) => s + r.total, 0)
  const expenseTotal = managementTotal + reserveTotal

  // Payment income by month
  const incomeByMonth = new Map<string, number>()
  for (const r of paymentRecords ?? []) {
    incomeByMonth.set(r.year_month, (incomeByMonth.get(r.year_month) ?? 0) + Number(r.paid_amount))
  }
  const incomeTotal = Array.from(incomeByMonth.values()).reduce((s, v) => s + v, 0)
  const balance = incomeTotal - expenseTotal

  return (
    <div className="px-6 py-8 max-w-4xl">
      {/* Screen-only nav */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/accounting/report" className="text-sm text-gray-500 hover:text-gray-700">
          ← 収支報告書一覧
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/accounting/report/${fiscalYearId}/monthly/${months[months.length - 1]}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            月次報告書 →
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Report header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{fy.year}年度 収支報告書</h1>
        <p className="text-sm text-gray-600 mt-1">{orgName}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {fy.start_date} 〜 {fy.end_date}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="収入合計" value={incomeTotal} />
        <SummaryCard label="支出合計" value={expenseTotal} />
        <SummaryCard label="差引残高" value={balance} highlight />
      </div>

      {/* Management expenses */}
      <Section title="管理費会計 — 支出">
        <ExpenseTable rows={managementByCategory} total={managementTotal} />
      </Section>

      {/* Reserve fund expenses */}
      <Section title="修繕積立金会計 — 支出">
        <ExpenseTable rows={reserveByCategory} total={reserveTotal} />
      </Section>

      {/* Income by month */}
      <Section title="入金実績（月別）">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-left font-medium text-gray-600">年月</th>
              <th className="py-2 text-right font-medium text-gray-600">入金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {months.map((ym) => {
              const amount = incomeByMonth.get(ym) ?? 0
              return (
                <tr key={ym}>
                  <td className="py-2 text-gray-700">{ym.replace('-', '/')}</td>
                  <td className="py-2 text-right text-gray-900">
                    {amount > 0 ? `${amount.toLocaleString()}円` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 font-semibold">
              <td className="py-2 text-gray-800">合計</td>
              <td className="py-2 text-right text-gray-900">{incomeTotal.toLocaleString()}円</td>
            </tr>
          </tfoot>
        </table>
      </Section>

      <p className="mt-8 text-xs text-gray-400 text-right print:block hidden">
        出力日: {new Date().toLocaleDateString('ja-JP')}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

function ExpenseTable({
  rows,
  total,
}: {
  rows: { name: string; total: number }[]
  total: number
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-2">支出なし</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="py-2 text-left font-medium text-gray-600">科目</th>
          <th className="py-2 text-right font-medium text-gray-600">金額</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="py-2 text-gray-700">{r.name}</td>
            <td className="py-2 text-right text-gray-900">{r.total.toLocaleString()}円</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-gray-300 font-semibold">
          <td className="py-2 text-gray-800">小計</td>
          <td className="py-2 text-right text-gray-900">{total.toLocaleString()}円</td>
        </tr>
      </tfoot>
    </table>
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
    <div className={`rounded-lg border p-4 text-center ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${isNegative ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value.toLocaleString()}円
      </p>
    </div>
  )
}
