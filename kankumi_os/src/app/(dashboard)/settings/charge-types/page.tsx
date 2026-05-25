import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChargeTypesForm } from '@/components/settings/charge-types-form'

export default async function ChargeTypesPage() {
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

  const { data: chargeTypes } = await supabase
    .from('charge_types')
    .select('id, type, alias_name, is_active')
    .eq('organization_id', membership.organization_id)
    .order('created_at')

  return (
    <div className="px-6 py-8 max-w-xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
          ← 組合設定
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">費用項目の管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          毎月の徴収項目を設定します。変更は即時に各部屋の月額料金設定に反映されます。
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ChargeTypesForm chargeTypes={chargeTypes ?? []} />
      </div>
    </div>
  )
}
