import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BankCsvImport } from '@/components/bank-imports/bank-csv-import'

const IMPORT_ROLES = ['admin', 'vice_president', 'treasurer']

export default async function ImportPage() {
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

  if (!membership || !IMPORT_ROLES.includes(membership.role)) redirect('/payments/transactions')

  const { data: mappers } = await supabase
    .from('bank_csv_mappers')
    .select('id, bank_name, account_label, preset_key, encoding')
    .eq('organization_id', membership.organization_id)
    .order('bank_name')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/payments/transactions" className="text-sm text-gray-500 hover:text-gray-700">
          ← 銀行明細
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">銀行明細CSVインポート</h1>
        <p className="text-sm text-gray-500 mt-1">
          銀行からダウンロードしたCSVファイルを取り込みます。重複明細は自動スキップされます。
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BankCsvImport mappers={mappers ?? []} />
      </div>
    </div>
  )
}
