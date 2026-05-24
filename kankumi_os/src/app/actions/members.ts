'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) redirect('/onboarding')
  return { supabase, orgId: data.organization_id, userId: user.id, role: data.role }
}

export async function inviteMember(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as MemberRole) || 'resident'
  const unitId = (formData.get('unit_id') as string)?.trim() || null

  if (!email) return 'メールアドレスを入力してください。'

  const adminClient = createAdminClient()

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { organization_id: orgId } }
  )

  if (inviteError) {
    if (inviteError.message.includes('already been registered')) {
      return 'このメールアドレスはすでに登録されています。'
    }
    return `招待の送信に失敗しました: ${inviteError.message}`
  }

  const invitedUserId = inviteData.user.id

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: orgId,
    user_id: invitedUserId,
    role,
    is_active: false,
    invited_by: userId,
  })

  if (memberError) {
    if (memberError.code === '23505') return 'このユーザーはすでにメンバーとして登録されています。'
    return 'メンバーの登録に失敗しました。'
  }

  if (role === 'resident' && unitId) {
    await supabase.from('unit_owners').insert({
      organization_id: orgId,
      unit_id: unitId,
      user_id: null,
      name: email,
      email,
      owner_type: 'resident',
      start_date: new Date().toISOString().slice(0, 10),
    })
  }

  revalidatePath('/settings/members')
  return null
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
  const { supabase, orgId } = await getContext()

  await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  revalidatePath('/settings/members')
}

export async function removeMember(memberId: string): Promise<void> {
  const { supabase, orgId } = await getContext()

  await supabase
    .from('organization_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  revalidatePath('/settings/members')
}
