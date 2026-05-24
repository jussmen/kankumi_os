import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PrintButton } from '@/components/report/print-button'

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

interface PageProps {
  params: Promise<{ fiscalYearId: string; yearMonth: string }>
}

export default async function MonthlyReportPage({ params }: PageProps) {
  const { fiscalYearId, yearMonth } = await params

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) redirect(`/accounting/report/${fiscalYearId}`)

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
    .select('id, year, start_date, end_date')
    .eq('id', fiscalYearId)
    .eq('organization_id', orgId)
    .single()

  if (!fy) redirect('/accounting/report')

  const [y, m] = yearMonth.split('-').map(Number)
  const nextMonthStart =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const [{ data: expenses }, { data: paymentRecords }] = await Promise.all([
    supabase
      .from('expenses')
      .select('expense_date, amount, vendor, description, expense_categories(name, account_type)')
      .eq('organization_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .gte('expense_date', `${yearMonth}-01`)
      .lt('expense_date', nextMonthStart)
      .order('expense_date'),
    supabase
      .from('payment_records')
      .select('paid_amount, status, units(unit_number)')
      .eq('organization_id', orgId)
      .eq('year_month', yearMonth)
      .in('status', ['confirmed', 'irregular']),
  ])

  interface ExpenseRow {
    expense_date: string
    amount: number | string
    vendor: string | null
    description: string | null
    expense_categories: { name: string; account_type: string } | null
  }

  const expenseTotal = (expenses as ExpenseRow[] | null ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  )

  interface PaymentRow {
    paid_amount: number | string
    status: string
    units: { unit_number: string } | null
  }

  const paymentTotal = (paymentRecords as PaymentRow[] | null ?? []).reduce(
    (s, r) => s + Number(r.paid_amount),
    0
  )

  const displayMonth = yearMonth.replace('-', '/')

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/accounting/report/${fiscalYearId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {fy.year}年度 年次報告書
        </Link>
        <PrintButton />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{displayMonth} 月次収支報告書</h1>
        <p className="text-sm text-gray-600 mt-1">{orgName}</p>
        <p className="text-xs text-gray-500 mt-0.5">{fy.year}年度（{fy.start_date} 〜 {fy.end_date}）</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard label="入金合計" value={paymentTotal} />
        <SummaryCard label="支出合計" value={expenseTotal} />
        <SummaryCard label="差引" value={paymentTotal - expenseTotal} highlight />
      </div>

      {/* Income */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          入金一覧
        </h2>
        {(paymentRecords as PaymentRow[] | null ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-2">入金記録なし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-600">部屋番号</th>
                <th className="py-2 text-right font-medium text-gray-600">入金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(paymentRecords as PaymentRow[]).map((r, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-700">
                    {r.units?.unit_number ?? '—'}
                  </td>
                  <td className="py-2 text-right text-gray-900">
                    {Number(r.paid_amount).toLocaleString()}円
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 font-semibold">
                <td className="py-2 text-gray-800">合計</td>
                <td className="py-2 text-right">{paymentTotal.toLocaleString()}円</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Expenses */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          支出一覧
        </h2>
        {(expenses as ExpenseRow[] | null ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-2">支出なし</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-600">日付</th>
                <th className="py-2 text-left font-medium text-gray-600">科目</th>
                <th className="py-2 text-left font-medium text-gray-600">支払先</th>
                <th className="py-2 text-right font-medium text-gray-600">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(expenses as ExpenseRow[]).map((e, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-600 whitespace-nowrap">{e.expense_date}</td>
                  <td className="py-2 text-gray-700">{e.expense_categories?.name ?? '—'}</td>
                  <td className="py-2 text-gray-600">{e.vendor ?? '—'}</td>
                  <td className="py-2 text-right text-gray-900">{Number(e.amount).toLocaleString()}円</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-300 font-semibold">
                <td colSpan={3} className="py-2 text-gray-800">合計</td>
                <td className="py-2 text-right">{expenseTotal.toLocaleString()}円</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400 text-right print:block hidden">
        出力日: {new Date().toLocaleDateString('ja-JP')}
      </p>
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
    <div className={`rounded-lg border p-4 text-center ${highlight ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${isNegative ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value.toLocaleString()}円
      </p>
    </div>
  )
}
