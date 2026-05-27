import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FiscalYearSelect } from '@/components/checklist/fiscal-year-select'
import type { Database } from '@/types/database'

type PaymentStatus = Database['public']['Enums']['payment_status']

const STATUS_CELL: Record<PaymentStatus | 'missing', { bg: string; label: string }> = {
  confirmed: { bg: 'bg-green-100 text-green-800 hover:bg-green-200', label: '済' },
  irregular:  { bg: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', label: '差異' },
  missing:    { bg: 'bg-gray-100 text-gray-400 hover:bg-gray-200', label: '—' },
  excluded:   { bg: 'bg-gray-50 text-gray-300', label: '除' },
}

function getFiscalYearMonths(startDate: string, endDate: string, isActive: boolean): string[] {
  const months: string[] = []
  const start = new Date(startDate)
  const now = new Date()
  const end = isActive
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(endDate)
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  while (d <= end) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return months
}

interface PageProps {
  searchParams: Promise<{ fiscal_year_id?: string }>
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams

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
        <h1 className="text-2xl font-bold text-gray-800 mb-4">入金管理</h1>
        <p className="text-sm text-gray-500">
          会計年度が設定されていません。
          <Link href="/checklist/new-fiscal-year" className="ml-1 text-blue-600 hover:underline">
            会計年度を作成
          </Link>
          してください。
        </p>
      </div>
    )
  }

  const activeFiscalYear = fiscalYears.find((fy) => fy.status === 'active')
  const selectedId = params.fiscal_year_id ?? activeFiscalYear?.id ?? fiscalYears[0].id
  const selectedYear = fiscalYears.find((fy) => fy.id === selectedId) ?? fiscalYears[0]
  const months = getFiscalYearMonths(
    selectedYear.start_date,
    selectedYear.end_date,
    selectedYear.status === 'active',
  )

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .neq('occupancy_status', 'excluded')
    .order('unit_number')

  const unitIds = (units ?? []).map((u) => u.id)

  const [{ data: records }, { data: profiles }, { data: charges }, { count: unmatchedCount }] = await Promise.all([
    supabase
      .from('payment_records')
      .select('unit_id, year_month, status')
      .eq('organization_id', orgId)
      .in('year_month', months),
    unitIds.length
      ? supabase
          .from('payment_profiles')
          .select('unit_id, source')
          .in('unit_id', unitIds)
          .is('effective_to', null)
      : Promise.resolve({ data: [] as { unit_id: string; source: string }[] }),
    unitIds.length
      ? supabase
          .from('unit_charges')
          .select('unit_id')
          .in('unit_id', unitIds)
          .is('effective_to', null)
      : Promise.resolve({ data: [] as { unit_id: string }[] }),
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'unmatched'),
  ])

  const recordMap = new Map<string, PaymentStatus>()
  for (const r of records ?? []) {
    recordMap.set(`${r.unit_id}:${r.year_month}`, r.status)
  }

  const profileUnitIds = new Set((profiles ?? []).map((p) => p.unit_id))
  const chargeUnitIds = new Set((charges ?? []).map((c) => c.unit_id))

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">入金管理</h1>
        </div>
        <div className="flex items-center gap-3">
          {(unmatchedCount ?? 0) > 0 && (
            <span className="text-sm text-yellow-600 font-medium">
              未照合 {unmatchedCount}件
            </span>
          )}
          <Link
            href="/payments/transactions"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            銀行明細
          </Link>
          {canEdit && (
            <Link
              href="/payments/import"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              CSVインポート
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-medium text-gray-700">会計年度</label>
        <FiscalYearSelect
          fiscalYears={fiscalYears}
          defaultValue={selectedYear.id}
          basePath="/payments"
        />
        <span className="text-xs text-gray-400">
          {months.length}ヶ月表示
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50 min-w-[120px]">
                部屋番号
              </th>
              <th className="px-3 py-3 text-center font-medium min-w-[72px]" title="振込情報 / 月額料金">
                準備
              </th>
              {months.map((ym) => (
                <th key={ym} className="px-3 py-3 text-center font-medium min-w-[72px]">
                  <Link href={`/payments/${ym}`} className="hover:text-blue-600 transition-colors">
                    {ym.replace('-', '/')}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(units ?? []).length === 0 ? (
              <tr>
                <td colSpan={months.length + 2} className="px-4 py-12 text-center text-gray-400">
                  住民情報がありません
                </td>
              </tr>
            ) : (
              (units ?? []).map((unit) => {
                const hasProfile = profileUnitIds.has(unit.id)
                const hasCharge = chargeUnitIds.has(unit.id)

                return (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <Link
                        href={`/units/${unit.id}`}
                        className="font-medium text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        {unit.unit_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex gap-0.5">
                        <Dot filled={hasProfile} title="振込情報" />
                        <Dot filled={hasCharge} title="月額料金" />
                      </span>
                    </td>
                    {months.map((ym) => {
                      const status = recordMap.get(`${unit.id}:${ym}`) ?? 'missing'
                      const cell = STATUS_CELL[status]
                      return (
                        <td key={ym} className="px-3 py-2 text-center">
                          <Link
                            href={`/payments/${ym}`}
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${cell.bg}`}
                          >
                            {cell.label}
                          </Link>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-green-100 text-green-800 font-medium">済</span>
          入金確認
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-yellow-100 text-yellow-800 font-medium">差異</span>
          金額差異
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 bg-gray-100 text-gray-400 font-medium">—</span>
          未入金
        </span>
        <span className="flex items-center gap-1">
          <Dot filled={true} title="" /><Dot filled={true} title="" />
          準備: 振込情報 / 月額料金
        </span>
      </div>
    </div>
  )
}

function Dot({ filled, title }: { filled: boolean; title: string }) {
  return (
    <span
      title={title}
      className={`inline-block w-2 h-2 rounded-full ${filled ? 'bg-blue-500' : 'bg-gray-200'}`}
    />
  )
}
