import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(unit_count, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const org = membership?.organizations as { unit_count: number; name: string } | null
  const orgId = (membership as { organization_id?: string } | null)?.organization_id

  if (!orgId) redirect('/onboarding')

  const yearMonth = currentYearMonth()

  const [
    { data: paymentRecords },
    { data: fiscalYears },
    { data: openTopics },
    { data: announcements },
  ] = await Promise.all([
    supabase
      .from('payment_records')
      .select('status, paid_amount')
      .eq('organization_id', orgId)
      .eq('year_month', yearMonth),
    supabase
      .from('fiscal_years')
      .select('id, year, status')
      .eq('organization_id', orgId)
      .order('year', { ascending: false }),
    supabase
      .from('topics')
      .select('id')
      .eq('organization_id', orgId)
      .in('status', ['open', 'in_progress']),
    supabase
      .from('announcements')
      .select('id, title, published_at')
      .eq('organization_id', orgId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  const activeFiscalYear = (fiscalYears ?? []).find((fy) => fy.status === 'active')

  const checklistResult = activeFiscalYear
    ? await supabase
        .from('annual_checklists')
        .select('status')
        .eq('organization_id', orgId)
        .eq('fiscal_year_id', activeFiscalYear.id)
    : { data: null }

  const checklistItems = checklistResult.data ?? []
  const checklistTotal = checklistItems.length
  const checklistCompleted = checklistItems.filter(
    (i) => i.status === 'completed' || i.status === 'skipped'
  ).length

  const confirmedCount = (paymentRecords ?? []).filter(
    (r) => r.status === 'confirmed' || r.status === 'irregular'
  ).length

  const unitCount = org?.unit_count ?? 0
  const collectionRate =
    unitCount > 0 ? Math.round((confirmedCount / unitCount) * 100) : null

  const totalIncome = (paymentRecords ?? [])
    .filter((r) => r.status === 'confirmed' || r.status === 'irregular')
    .reduce((sum, r) => sum + Number(r.paid_amount), 0)

  const openTopicCount = (openTopics ?? []).length
  const hasNoFiscalYear = !fiscalYears || fiscalYears.length === 0

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          {org?.name ?? '管理組合'}の運営状況
        </p>
      </div>

      {hasNoFiscalYear && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">会計年度が設定されていません</p>
            <p className="text-sm text-amber-700 mt-0.5">
              会計年度を設定すると、支出管理・予算管理・収支報告書など会計機能が使えます。
            </p>
          </div>
          <Link
            href="/checklist/new-fiscal-year"
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            会計年度を設定
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <OverviewCard
          title="総戸数"
          value={unitCount > 0 ? unitCount.toString() : '—'}
          unit="戸"
          href="/units"
        />
        <OverviewCard
          title={`今月の収納率（${yearMonth.replace('-', '/')}）`}
          value={collectionRate !== null ? collectionRate.toString() : '—'}
          unit="%"
          href="/payments"
        />
        <OverviewCard
          title="未解決の議題"
          value={openTopicCount.toString()}
          unit="件"
          href="/topics"
        />
        <OverviewCard
          title="年間業務の進捗"
          value={
            checklistTotal > 0
              ? Math.round((checklistCompleted / checklistTotal) * 100).toString()
              : '—'
          }
          unit={checklistTotal > 0 ? '%' : ''}
          href="/checklist"
          subLabel={
            checklistTotal > 0
              ? `${checklistCompleted} / ${checklistTotal} 件完了`
              : activeFiscalYear
                ? '項目がありません'
                : '年度未設定'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">直近のお知らせ</h2>
            <Link href="/announcements" className="text-sm text-blue-600 hover:text-blue-800">
              すべて見る →
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {(announcements ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">まだお知らせがありません。</p>
                <Link href="/announcements/new" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                  お知らせを作成する →
                </Link>
              </div>
            ) : (
              (announcements ?? []).map((a) => (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-800 truncate mr-4">{a.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString('ja-JP') : ''}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              今月の集金状況（{yearMonth.replace('-', '/')}）
            </h2>
            <Link href="/payments" className="text-sm text-blue-600 hover:text-blue-800">
              詳細を見る →
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-5 space-y-4">
            {unitCount === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                住民台帳に部屋が登録されていません。
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">入金済み</span>
                  <span className="text-sm font-medium text-gray-800">
                    {confirmedCount} / {unitCount} 戸
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${collectionRate ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-500">今月の収入合計</span>
                  <span className="text-base font-bold text-gray-800">
                    ¥{totalIncome.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function OverviewCard({
  title,
  value,
  unit,
  href,
  subLabel,
}: {
  title: string
  value: string
  unit: string
  href: string
  subLabel?: string
}) {
  return (
    <Link href={href} className="block bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 transition-colors">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-800">
        {value}
        {unit && (
          <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
        )}
      </p>
      {subLabel && (
        <p className="mt-1 text-xs text-gray-400">{subLabel}</p>
      )}
    </Link>
  )
}
