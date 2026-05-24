import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createExpenseCategory } from '@/app/actions/expenses'
import { CategoryForm } from '@/components/expenses/category-form'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  management: '管理費会計',
  reserve_fund: '修繕積立金会計',
}

export default async function CategoriesPage() {
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

  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name, account_type, is_active, is_template')
    .eq('organization_id', orgId)
    .order('account_type')
    .order('name')

  const managementCategories = (categories ?? []).filter(
    (c) => c.account_type === 'management'
  )
  const reserveFundCategories = (categories ?? []).filter(
    (c) => c.account_type === 'reserve_fund'
  )

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">科目管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">支出科目の一覧・追加</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CategoryGroup
          title={ACCOUNT_TYPE_LABELS['management']}
          categories={managementCategories}
        />
        <CategoryGroup
          title={ACCOUNT_TYPE_LABELS['reserve_fund']}
          categories={reserveFundCategories}
        />
      </div>

      {canEdit && (
        <div className="max-w-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">+ 科目追加</h2>
          <CategoryForm action={createExpenseCategory} />
        </div>
      )}
    </div>
  )
}

function CategoryGroup({
  title,
  categories,
}: {
  title: string
  categories: Array<{ id: string; name: string; is_active: boolean; is_template: boolean }>
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {categories.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">科目がありません</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                cat.is_template ? 'text-gray-400' : 'text-gray-800'
              }`}
            >
              <span>{cat.name}</span>
              <span className="flex gap-2">
                {cat.is_template && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    テンプレート
                  </span>
                )}
                {!cat.is_active && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    無効
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
