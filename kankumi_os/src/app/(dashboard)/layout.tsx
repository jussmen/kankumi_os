import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) redirect('/onboarding')

  const org = membership.organizations as { name: string } | null
  const orgName = org?.name ?? ''
  const role = membership.role as MemberRole
  const orgId = membership.organization_id

  let unitNumber: string | undefined
  if (role === 'resident') {
    const h = await headers()
    const pathname = h.get('x-pathname') ?? ''

    const { data: ownerRow } = await supabase
      .from('unit_owners')
      .select('name_kana, units(unit_number)')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .is('end_date', null)
      .single()

    const unitInfo = ownerRow?.units as { unit_number: string } | null
    unitNumber = unitInfo?.unit_number

    if (!ownerRow?.name_kana && pathname !== '/my/setup') {
      redirect('/my/setup')
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar role={role} orgName={orgName} userEmail={user.email ?? ''} unitNumber={unitNumber} />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  )
}
