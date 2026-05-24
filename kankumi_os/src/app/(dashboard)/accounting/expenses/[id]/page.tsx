import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateExpense, deleteExpense } from '@/app/actions/expenses'
import { ExpenseForm } from '@/components/expenses/expense-form'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  management: '管理費会計',
  reserve_fund: '修繕積立金会計',
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function ExpenseDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

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

  const { data: expense } = await supabase
    .from('expenses')
    .select('id, expense_date, amount, category_id, vendor, description, receipt_url, fiscal_year_id, expense_categories(id, name, account_type)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!expense) notFound()

  const cat = Array.isArray(expense.expense_categories)
    ? expense.expense_categories[0]
    : expense.expense_categories

  const isEditing = edit === '1' && canEdit

  const { data: categories } = isEditing
    ? await supabase
        .from('expense_categories')
        .select('id, name, account_type, is_active')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name')
    : { data: [] }

  const boundUpdateExpense = updateExpense.bind(null, id)

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/accounting/expenses" className="text-sm text-gray-500 hover:text-gray-700">
          ← 支出一覧
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">支出詳細</h1>
          {canEdit && !isEditing && (
            <div className="flex gap-2">
              <Link
                href={`/accounting/expenses/${id}?edit=1`}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                編集
              </Link>
              <form
                action={async () => {
                  'use server'
                  await deleteExpense(id)
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <ExpenseForm
          action={boundUpdateExpense}
          categories={categories ?? []}
          fiscalYearId={expense.fiscal_year_id}
          defaultValues={{
            expense_date: expense.expense_date,
            amount: expense.amount,
            category_id: expense.category_id,
            vendor: expense.vendor,
            description: expense.description,
            receipt_url: expense.receipt_url,
          }}
          submitLabel="更新する"
          cancelHref={`/accounting/expenses/${id}`}
        />
      ) : (
        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            <Row label="支出日" value={expense.expense_date} />
            <Row label="金額" value={`¥${expense.amount.toLocaleString()}`} />
            <Row
              label="科目"
              value={
                cat
                  ? `[${ACCOUNT_TYPE_LABELS[cat.account_type as AccountType]}] ${cat.name}`
                  : '—'
              }
            />
            <Row label="支払先" value={expense.vendor ?? '—'} />
            <Row label="摘要" value={expense.description ?? '—'} />
            <Row
              label="領収書URL"
              value={
                expense.receipt_url ? (
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {expense.receipt_url}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 text-sm">
      <span className="w-32 shrink-0 font-medium text-gray-500">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
