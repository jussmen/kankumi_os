import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ManualMatchForm } from '@/components/payments/manual-match-form'

interface PageProps {
  params: Promise<{ yearMonth: string }>
}

function nextMonthStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export default async function ReviewPage({ params }: PageProps) {
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

  if (!['admin', 'vice_president', 'treasurer'].includes(membership.role)) {
    redirect(`/payments/${yearMonth}`)
  }

  const { organization_id: orgId } = membership

  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, amount, description')
    .eq('organization_id', orgId)
    .eq('status', 'unmatched')
    .gte('transaction_date', `${yearMonth}-01`)
    .lt('transaction_date', nextMonthStart(yearMonth))
    .order('transaction_date', { ascending: false })

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .neq('occupancy_status', 'excluded')
    .order('unit_number')

  const displayMonth = yearMonth.replace('-', '/')

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/payments/${yearMonth}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {displayMonth} 入金状況
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">手動照合</h1>
        <p className="text-sm text-gray-500 mt-1">
          {displayMonth} の未照合明細を部屋番号に紐付けます。
        </p>
      </div>

      {!transactions || transactions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-12 text-center">
          <p className="text-sm text-gray-400">未照合の明細はありません</p>
          <Link
            href={`/payments/${yearMonth}`}
            className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            ← 入金状況へ戻る
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tx.transaction_date}</p>
                </div>
                <p className="text-base font-bold text-gray-900 ml-4 whitespace-nowrap">
                  {Number(tx.amount).toLocaleString()}円
                </p>
              </div>
              <ManualMatchForm
                transactionId={tx.id}
                yearMonth={yearMonth}
                units={units ?? []}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
