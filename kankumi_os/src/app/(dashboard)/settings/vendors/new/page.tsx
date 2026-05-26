import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorForm } from '@/components/vendors/vendor-form'
import { createVendor } from '@/app/actions/vendors'

export default async function NewVendorPage() {
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

  const canManage = membership.role === 'admin' || membership.role === 'vice_president'
  if (!canManage) redirect('/settings')

  return (
    <div className="px-6 py-8 max-w-xl">
      <div className="mb-6">
        <Link href="/settings/vendors" className="text-sm text-gray-500 hover:text-gray-700">
          ← 業者管理
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">業者を追加</h1>
        <p className="text-sm text-gray-500 mt-0.5">新しい業者情報を登録します。</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <VendorForm action={createVendor} submitLabel="業者を追加" />
      </div>
    </div>
  )
}
