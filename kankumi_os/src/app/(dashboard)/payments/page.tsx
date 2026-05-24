import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type PaymentStatus = Database['public']['Enums']['payment_status']

const STATUS_BADGE: Record<PaymentStatus | 'missing', string> = {
  confirmed: 'bg-green-100 text-green-800',
  irregular: 'bg-yellow-100 text-yellow-800',
  missing: 'bg-gray-100 text-gray-400',
  excluded: 'bg-gray-50 text-gray-300',
}

const STATUS_LABEL: Record<PaymentStatus | 'missing', string> = {
  confirmed: '済',
  irregular: '差異',
  missing: '—',
  excluded: '除',
}

function getLastMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }
  return months
}

export default async function PaymentsPage() {
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
  const months = getLastMonths(6)
  const canEdit = ['admin', 'vice_president', 'treasurer'].includes(role)

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .neq('occupancy_status', 'excluded')
    .order('unit_number')

  const { data: records } = await supabase
    .from('payment_records')
    .select('unit_id, year_month, status')
    .eq('organization_id', orgId)
    .in('year_month', months)

  const recordMap = new Map<string, PaymentStatus>()
  for (const r of records ?? []) {
    recordMap.set(`${r.unit_id}:${r.year_month}`, r.status)
  }

  const { count: unmatchedCount } = await supabase
    .from('bank_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'unmatched')

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">入金管理</h1>
          <p className="text-sm text-gray-500 mt-1">月別入金状況マトリクス（直近6ヶ月）</p>
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

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[120px]">
                部屋番号
              </th>
              {months.map((ym) => (
                <th
                  key={ym}
                  className="px-3 py-3 text-center font-medium min-w-[80px]"
                >
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
                <td colSpan={months.length + 1} className="px-4 py-12 text-center text-gray-400">
                  Unit情報がありません
                </td>
              </tr>
            ) : (
              (units ?? []).map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-white border-r border-gray-100">
                    {unit.unit_number}
                  </td>
                  {months.map((ym) => {
                    const status = recordMap.get(`${unit.id}:${ym}`) ?? 'missing'
                    return (
                      <td key={ym} className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
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
      </div>
    </div>
  )
}
