import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { addBankAccount, deleteBankAccount } from '@/app/actions/bank-settings'
import { AddBankAccountForm } from '@/components/settings/add-bank-account-form'

const PRESET_LABELS: Record<string, string> = {
  resona: 'りそな銀行',
  mizuho: 'みずほ銀行',
  'yokohama-bank': '横浜銀行',
}

export default async function BankAccountsPage() {
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
  if (membership.role !== 'admin') redirect('/settings')

  const { data: mappers } = await supabase
    .from('bank_csv_mappers')
    .select('id, bank_name, account_label, preset_key, encoding')
    .eq('organization_id', membership.organization_id)
    .order('bank_name')

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
          ← 組合設定
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">銀行口座設定</h1>
        <p className="text-sm text-gray-500 mt-1">
          CSVインポートで使用する銀行口座を登録します。
        </p>
      </div>

      {/* 登録済み口座 */}
      {(mappers ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center mb-6">
          <p className="text-sm text-gray-400">登録済みの銀行口座はありません。</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {(mappers ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {m.account_label ? `${m.account_label}（${m.bank_name}）` : m.bank_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m.preset_key ? PRESET_LABELS[m.preset_key] ?? m.preset_key : '設定なし'}
                  　{m.encoding}
                </p>
              </div>
              <form
                action={async () => {
                  'use server'
                  await deleteBankAccount(m.id)
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:text-red-700 transition-colors shrink-0"
                >
                  削除
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <AddBankAccountForm action={addBankAccount} />
    </div>
  )
}
