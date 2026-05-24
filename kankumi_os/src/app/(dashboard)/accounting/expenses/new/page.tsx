import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createExpense } from '@/app/actions/expenses'
import { ExpenseForm } from '@/components/expenses/expense-form'

interface PageProps {
  searchParams: Promise<{ fiscal_year_id?: string }>
}

export default async function NewExpensePage({ searchParams }: PageProps) {
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

  const { orgId, role } = { orgId: membership.organization_id, role: membership.role }

  if (!['admin', 'vice_president', 'treasurer'].includes(role)) {
    redirect('/accounting/expenses')
  }

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    redirect('/accounting/expenses')
  }

  const activeFiscalYear =
    fiscalYears.find((fy) => fy.status === 'active') ?? fiscalYears[0]
  const selectedFiscalYearId =
    fiscal_year_id && fiscalYears.some((fy) => fy.id === fiscal_year_id)
      ? fiscal_year_id
      : activeFiscalYear.id

  const selectedFiscalYear = fiscalYears.find((fy) => fy.id === selectedFiscalYearId) ?? activeFiscalYear

  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name, account_type, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/accounting/expenses" className="text-sm text-gray-500 hover:text-gray-700">
          ← 支出一覧
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">支出登録</h1>
        <p className="text-sm text-gray-500 mt-0.5">{selectedFiscalYear.year}年度</p>
      </div>

      <ExpenseForm
        action={createExpense}
        categories={categories ?? []}
        fiscalYearId={selectedFiscalYearId}
        submitLabel="登録する"
        cancelHref="/accounting/expenses"
      />
    </div>
  )
}
