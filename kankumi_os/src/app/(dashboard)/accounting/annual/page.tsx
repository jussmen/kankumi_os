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
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">会計年度が登録されていません。</p>
          <Link
            href="/checklist/new-fiscal-year"
            className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            会計年度を登録する →
          </Link>
        </div>
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
          会計年度ごとの Unit別入金期待値と実績を比較。単月差異も年間累計が一致すれば確定に変換します。
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
