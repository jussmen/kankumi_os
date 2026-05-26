import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorForm } from '@/components/vendors/vendor-form'
import { updateVendor } from '@/app/actions/vendors'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params

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

  const { data: vendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .eq('organization_id', membership.organization_id)
    .single()

  if (!vendor) notFound()

  const updateAction = updateVendor.bind(null, id)

  return (
    <div className="px-6 py-8 max-w-xl">
      <div className="mb-6">
        <Link href={`/settings/vendors/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {vendor.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">業者を編集</h1>
        <p className="text-sm text-gray-500 mt-0.5">業者情報を変更します。</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <VendorForm
          action={updateAction}
          defaultValues={vendor}
          submitLabel="変更を保存"
        />
      </div>
    </div>
  )
}
