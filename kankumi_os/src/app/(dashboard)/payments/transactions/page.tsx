import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ignoreTransaction } from '@/app/actions/bank-imports'
import { ManualMatchForm } from '@/components/bank-imports/manual-match-form'
import type { Database } from '@/types/database'

type TransactionStatus = Database['public']['Enums']['transaction_status']

const STATUS_LABELS: Record<TransactionStatus, string> = {
  unmatched: '未照合',
  matched: '照合済',
  ignored: '無視',
}

const STATUS_BADGE: Record<TransactionStatus, string> = {
  unmatched: 'bg-yellow-100 text-yellow-800',
  matched: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-500',
}

const IMPORT_ROLES = ['admin', 'vice_president', 'treasurer']

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { status } = await searchParams

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

  const [{ count: unmatchedCount }, { data: units }] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'unmatched'),
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('organization_id', orgId)
      .order('unit_number'),
  ])

  const activeStatus = (status as TransactionStatus | 'all') ?? 'unmatched'

  let query = supabase
    .from('bank_transactions')
    .select('id, transaction_date, amount, description, status')
    .eq('organization_id', orgId)
    .order('transaction_date', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus as TransactionStatus)
  }

  const { data: transactions } = await query

  const tabs: { key: TransactionStatus | 'all'; label: string }[] = [
    { key: 'unmatched', label: '未照合' },
    { key: 'matched', label: '照合済' },
    { key: 'ignored', label: '無視' },
    { key: 'all', label: 'すべて' },
  ]

  const canImport = IMPORT_ROLES.includes(role)

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">銀行明細</h1>
          <p className="text-sm text-gray-500 mt-1">銀行取引明細の照合・管理</p>
        </div>
        {canImport && (
          <Link
            href="/payments/import"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            CSVインポート
          </Link>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/payments/transactions?status=${tab.key}`}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeStatus === tab.key
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'unmatched' && (unmatchedCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                {unmatchedCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!transactions || transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">明細がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">日付</th>
                <th className="px-4 py-3 text-right font-medium">金額</th>
                <th className="px-4 py-3 text-left font-medium">摘要</th>
                <th className="px-4 py-3 text-left font-medium">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{tx.transaction_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                    {tx.amount.toLocaleString()}円
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{tx.description}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[tx.status]}`}
                    >
                      {STATUS_LABELS[tx.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tx.status === 'unmatched' && canImport && (
                      <div className="flex flex-col items-end gap-1.5">
                        <ManualMatchForm
                          txId={tx.id}
                          defaultYearMonth={tx.transaction_date.slice(0, 7)}
                          units={units ?? []}
                        />
                        <form
                          action={async () => {
                            'use server'
                            await ignoreTransaction(tx.id)
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            無視
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
