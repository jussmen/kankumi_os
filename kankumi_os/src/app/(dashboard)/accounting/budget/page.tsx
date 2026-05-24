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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">予算管理</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">会計年度が登録されていません。</p>
          <Link href="/checklist/new-fiscal-year" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800">
            会計年度を登録する →
          </Link>
        </div>
      </div>
    )
  }

  const activeFyId = fiscal_year_id ?? fiscalYears[0].id
  const activeFy = fiscalYears.find((fy) => fy.id === activeFyId) ?? fiscalYears[0]

  const [{ data: categories }, { data: budgets }, { data: expenses }] = await Promise.all([
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
    </div>
  )
}
