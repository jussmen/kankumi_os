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

  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''

  const { data: ownerRow } = await supabase
    .from('unit_owners')
    .select('name_kana')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .is('end_date', null)
    .maybeSingle()

  if (ownerRow && !ownerRow.name_kana && pathname !== '/my/profile') {
    redirect('/my/profile')
  }

  return (
    <div className="flex h-full">
      <Sidebar role={role} orgName={orgName} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto bg-gray-50 pt-14 md:pt-0">{children}</main>
    </div>
  )
}
