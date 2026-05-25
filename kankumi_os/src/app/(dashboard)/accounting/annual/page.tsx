import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AnnualView } from '@/components/annual/annual-view'

export default async function AnnualPage() {
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

  const allowed = ['admin', 'vice_president', 'treasurer', 'auditor']
  if (!allowed.includes(membership.role)) redirect('/dashboard')

  const { organization_id: orgId, role } = membership
  const canWrite = ['admin', 'vice_president', 'treasurer'].includes(role)

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <Link href="/accounting/expenses" className="text-sm text-gray-500 hover:text-gray-700">
            ← 支出管理
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">年間収支照合</h1>
        </div>
        <NoFiscalYearGuide />
      </div>
    )
  }

  const defaultFiscalYearId = fiscalYears[0].id

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/accounting/expenses" className="text-sm text-gray-500 hover:text-gray-700">
          ← 支出管理
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">年間収支照合</h1>
        <p className="text-sm text-gray-500 mt-1">
          会計年度ごとの 部屋別入金期待値と実績を比較。単月差異も年間累計が一致すれば確定に変換します。
        </p>
      </div>

      <AnnualView
        fiscalYears={fiscalYears}
        defaultFiscalYearId={defaultFiscalYearId}
        canWrite={canWrite}
      />
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
