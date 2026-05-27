import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function ExportRow({
  title,
  description,
  href,
  filename,
}: {
  title: string
  description: string
  href: string
  filename: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <a
        href={href}
        download={filename}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
      >
        CSVダウンロード
      </a>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  if (membership.role !== 'admin') redirect('/dashboard')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">組合設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理組合の各種設定を管理します。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        <Link
          href="/settings/members"
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-base font-semibold text-gray-800">メンバー管理</h2>
          <p className="text-sm text-gray-500">
            組合メンバーの招待・ロール変更・削除を行います。
          </p>
        </Link>
        <Link
          href="/settings/charge-types"
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-base font-semibold text-gray-800">費用項目の管理</h2>
          <p className="text-sm text-gray-500">
            管理費・修繕積立金などの徴収項目を追加・変更します。
          </p>
        </Link>
        <Link
          href="/settings/bank-accounts"
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-base font-semibold text-gray-800">銀行口座設定</h2>
          <p className="text-sm text-gray-500">
            CSVインポートで使用する銀行口座を登録・変更します。
          </p>
        </Link>
      </div>

      <div className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">データエクスポート</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          <ExportRow
            title="住民台帳"
            description="部屋番号・階数・専有面積・ステータスの一覧"
            href="/api/export/units"
            filename="units.csv"
          />
          <ExportRow
            title="入金記録"
            description="全期間の入金ステータスと入金額"
            href="/api/export/payments"
            filename="payments.csv"
          />
          <ExportRow
            title="支出記録"
            description="全期間の支出一覧（科目・金額・支払先）"
            href="/api/export/expenses"
            filename="expenses.csv"
          />
        </div>
      </div>
    </div>
  )
}
