import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BudgetForm } from '@/components/budget/budget-form'
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

export default async function BudgetPage({ searchParams }: PageProps) {
  const { fiscal_year_id } = await searchParams

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
  if (!ALLOWED_ROLES.includes(membership.role)) redirect('/dashboard')

  const { organization_id: orgId, role } = membership
  const canEdit = ['admin', 'vice_president', 'treasurer'].includes(role)

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">予算管理</h1>
        <NoFiscalYearGuide />
      </div>
    )
  }

  const activeFyId = fiscal_year_id ?? fiscalYears[0].id
  const activeFy = fiscalYears.find((fy) => fy.id === activeFyId) ?? fiscalYears[0]

  const [{ data: categories }, { data: budgets }, { data: expenses }, { data: contracts }] = await Promise.all([
    supabase
      .from('expense_categories')
      .select('id, name, account_type')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('account_type')
      .order('name'),
    supabase
      .from('budgets')
      .select('category_id, budgeted_amount')
      .eq('fiscal_year_id', activeFy.id),
    supabase
      .from('expenses')
      .select('category_id, amount')
      .eq('organization_id', orgId)
      .eq('fiscal_year_id', activeFy.id),
    supabase
      .from('vendor_contracts')
      .select('id, service_description, cost_amount, cost_cycle, vendors(name)')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at'),
  ])

  const budgetMap = new Map<string, number>(
    (budgets ?? []).map((b) => [b.category_id, Number(b.budgeted_amount)])
  )
  const actualMap = new Map<string, number>()
  for (const e of expenses ?? []) {
    actualMap.set(e.category_id, (actualMap.get(e.category_id) ?? 0) + Number(e.amount))
  }

  const accountTypes: AccountType[] = ['management', 'reserve_fund']

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">予算管理</h1>
          <p className="text-sm text-gray-500 mt-1">科目別予算と実績の対比</p>
        </div>
        <div className="flex items-center gap-2">
          {fiscalYears.map((fy) => (
            <Link
              key={fy.id}
              href={`/accounting/budget?fiscal_year_id=${fy.id}`}
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
      </div>

      <BudgetForm
        fiscalYearId={activeFy.id}
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          accountType: c.account_type as AccountType,
          budgeted: budgetMap.get(c.id) ?? 0,
          actual: actualMap.get(c.id) ?? 0,
        }))}
        accountTypes={accountTypes}
        accountTypeLabels={ACCOUNT_TYPE_LABELS}
        canEdit={canEdit}
      />

      {(contracts ?? []).length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden max-w-2xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">参考：業者契約費用</h2>
            <p className="text-xs text-gray-400 mt-0.5">予算入力の参考として — 自動反映はされません</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">業者名</th>
                <th className="px-3 py-2 text-left font-medium">サービス</th>
                <th className="px-3 py-2 text-right font-medium">費用</th>
                <th className="px-3 py-2 text-left font-medium">サイクル</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(contracts ?? []).map((c) => {
                const vendor = Array.isArray(c.vendors) ? c.vendors[0] : c.vendors
                const cycleLabel = c.cost_cycle === 'monthly' ? '月額' : c.cost_cycle === 'annual' ? '年額' : c.cost_cycle ?? ''
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{vendor?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{c.service_description ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700 font-medium tabular-nums">
                      {c.cost_amount ? `¥${Number(c.cost_amount).toLocaleString('ja-JP')}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{cycleLabel}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 text-right">
            <span className="text-xs text-gray-500">
              年額合計目安: ¥{(contracts ?? []).reduce((s, c) => {
                if (!c.cost_amount) return s
                const amt = Number(c.cost_amount)
                return s + (c.cost_cycle === 'monthly' ? amt * 12 : amt)
              }, 0).toLocaleString('ja-JP')}
            </span>
          </div>
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
