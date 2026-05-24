import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

export default async function ReportListPage() {
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

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('organization_id', membership.organization_id)
    .order('year', { ascending: false })

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">収支報告書</h1>
        <p className="text-sm text-gray-500 mt-1">
          会計年度ごとの収支報告書を印刷・PDF保存できます。
        </p>
      </div>

      {!fiscalYears || fiscalYears.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">会計年度が登録されていません。</p>
          <Link
            href="/checklist/new-fiscal-year"
            className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            会計年度を登録する →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {fiscalYears.map((fy) => (
            <div
              key={fy.id}
              className="bg-white rounded-lg border border-gray-200 px-5 py-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {fy.year}年度
                  {fy.status === 'closed' && (
                    <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      締済
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fy.start_date} 〜 {fy.end_date}
                </p>
              </div>
              <Link
                href={`/accounting/report/${fy.id}`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                年次報告書を見る
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
