import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AutoMatchButton } from '@/components/payments/auto-match-button'
import type { Database } from '@/types/database'

type PaymentStatus = Database['public']['Enums']['payment_status']

interface PageProps {
  params: Promise<{ yearMonth: string }>
}

const STATUS_BADGE: Record<PaymentStatus | 'missing', string> = {
  confirmed: 'bg-green-100 text-green-800',
  irregular: 'bg-yellow-100 text-yellow-800',
  missing: 'bg-gray-100 text-gray-500',
  excluded: 'bg-gray-50 text-gray-400',
}

const STATUS_LABEL: Record<PaymentStatus | 'missing', string> = {
  confirmed: '入金確認',
  irregular: '差異あり',
  missing: '未入金',
  excluded: '除外',
}

function nextMonthStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export default async function YearMonthPage({ params }: PageProps) {
  const { yearMonth } = await params

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) redirect('/payments')

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

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .neq('occupancy_status', 'excluded')
    .order('unit_number')

  const { data: records } = await supabase
    .from('payment_records')
    .select('id, unit_id, status, paid_amount, bank_transaction_id, has_irregularity_flag')
    .eq('organization_id', orgId)
    .eq('year_month', yearMonth)

  const recordByUnit = new Map(
    (records ?? []).map((r) => [r.unit_id, r])
  )

  const confirmedCount = (records ?? []).filter((r) => r.status === 'confirmed').length
  const irregularCount = (records ?? []).filter((r) => r.status === 'irregular').length
  const totalUnits = (units ?? []).length
  const missingCount = totalUnits - confirmedCount - irregularCount
  const totalAmount = (records ?? [])
    .filter((r) => r.status === 'confirmed' || r.status === 'irregular')
    .reduce((sum, r) => sum + Number(r.paid_amount), 0)

  const { count: unmatchedCount } = await supabase
    .from('bank_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'unmatched')
    .gte('transaction_date', `${yearMonth}-01`)
    .lt('transaction_date', nextMonthStart(yearMonth))

  const displayMonth = yearMonth.replace('-', '/')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/payments" className="text-sm text-gray-500 hover:text-gray-700">
          ← 入金管理
        </Link>
        <div className="flex items-start justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-800">{displayMonth} 入金状況</h1>
          {canEdit && (
            <div className="flex items-center gap-4">
              {(unmatchedCount ?? 0) > 0 && (
                <Link
                  href={`/payments/${yearMonth}/review`}
                  className="text-sm text-yellow-600 hover:text-yellow-800 font-medium transition-colors"
                >
                  未照合 {unmatchedCount}件 → 手動照合
                </Link>
              )}
              <AutoMatchButton yearMonth={yearMonth} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="入金確認" value={confirmedCount} unit="戸" color="green" />
        <StatCard label="差異あり" value={irregularCount} unit="戸" color="yellow" />
        <StatCard label="未入金" value={missingCount} unit="戸" color="gray" />
        <StatCard label="収入合計" value={totalAmount.toLocaleString()} unit="円" color="blue" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">部屋番号</th>
              <th className="px-4 py-3 text-left font-medium">ステータス</th>
              <th className="px-4 py-3 text-right font-medium">入金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(units ?? []).map((unit) => {
              const rec = recordByUnit.get(unit.id)
              const status = rec?.status ?? 'missing'
              return (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{unit.unit_number}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    {rec?.has_irregularity_flag && (
                      <span className="ml-2 text-xs text-yellow-600">金額差異</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">
                    {rec && Number(rec.paid_amount) > 0
                      ? `${Number(rec.paid_amount).toLocaleString()}円`
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: number | string
  unit: string
  color: 'green' | 'yellow' | 'gray' | 'blue'
}) {
  const colorMap = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-500',
    blue: 'text-blue-600',
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colorMap[color]}`}>
        {value}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}
