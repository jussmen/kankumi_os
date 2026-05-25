'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

async function getCallbackUrl() {
  const h = await headers()
  const host = h.get('host') ?? 'kankumiapp.jp'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}/auth/callback`
}

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
  const { orgId, userId } = await getContext()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = (formData.get('role') as MemberRole) || 'resident'
  const unitId = (formData.get('unit_id') as string)?.trim() || null

  if (!email) return 'メールアドレスを入力してください。'
  if (role === 'resident' && !unitId) return '住民の場合は部屋番号を選択してください。'

  const adminClient = createAdminClient()

  // auth ユーザー一覧を先に取得（孤立チェックと既存ユーザー判定に共用）
  const { data: { users: allAuthUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const validUserIds = new Set(allAuthUsers.map((u) => u.id))
  const validEmails = new Set(allAuthUsers.map((u) => u.email).filter((e): e is string => !!e))

  // 同じ部屋への重複招待チェック（Supabase で直接削除された孤立レコードは自動クリーンアップ）
  if (role === 'resident' && unitId) {
    const { data: existingOwners } = await adminClient
      .from('unit_owners')
      .select('id, user_id, email')
      .eq('organization_id', orgId)
      .eq('unit_id', unitId)
      .is('end_date', null)

    if (existingOwners && existingOwners.length > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const orphans = existingOwners.filter((uo) =>
        uo.user_id ? !validUserIds.has(uo.user_id) : uo.email ? !validEmails.has(uo.email) : true
      )
      const activeOwners = existingOwners.filter((uo) =>
        uo.user_id ? validUserIds.has(uo.user_id) : uo.email ? validEmails.has(uo.email) : false
      )

      // 孤立した unit_owners を終了させる（再招待を可能にする）
      if (orphans.length > 0) {
        await adminClient
          .from('unit_owners')
          .update({ end_date: today })
          .in('id', orphans.map((o) => o.id))
      }

      if (activeOwners.length > 0) {
        return 'この部屋にはすでに招待済み、または入居中のメンバーがいます。'
      }
    }
  }

  // 既存アカウントかどうかを確認
  const existingUser = allAuthUsers.find((u) => u.email === email)

  if (existingUser) {
    // 既存アカウント → ロールのみ更新
    const { data: existingMember } = await adminClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingMember) {
      await adminClient
        .from('organization_members')
        .update({ role, is_active: true })
        .eq('id', existingMember.id)
    } else {
      await adminClient.from('organization_members').insert({
        organization_id: orgId,
        user_id: existingUser.id,
        role,
        is_active: true,
        invited_by: userId,
      })
    }

    revalidatePath('/settings/members')
    return null
  }

  // 新規ユーザーへの招待
  const callbackUrl = await getCallbackUrl()
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { organization_id: orgId }, redirectTo: callbackUrl }
  )

  if (inviteError) {
    return `招待の送信に失敗しました: ${inviteError.message}`
  }

  const invitedUserId = inviteData.user.id

  const { error: memberError } = await adminClient.from('organization_members').insert({
    organization_id: orgId,
    user_id: invitedUserId,
    role,
    is_active: false,
    invited_by: userId,
  })

  if (memberError) {
    if (memberError.code === '23505') return 'このユーザーはすでにメンバーとして登録されています。'
    return `メンバーの登録に失敗しました: ${memberError.message}`
  }

  if (role === 'resident' && unitId) {
    await adminClient.from('unit_owners').insert({
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
  const { orgId } = await getContext()
  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('organization_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single()

  await adminClient
    .from('organization_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (member?.role === 'resident') {
    const today = new Date().toISOString().slice(0, 10)
    // アクティブな unit_owners を終了
    await adminClient
      .from('unit_owners')
      .update({ end_date: today })
      .eq('organization_id', orgId)
      .eq('user_id', member.user_id)
      .is('end_date', null)

    // 保留中（user_id IS NULL）の unit_owners を終了
    const { data: authUserData } = await adminClient.auth.admin.getUserById(member.user_id)
    if (authUserData.user?.email) {
      await adminClient
        .from('unit_owners')
        .update({ end_date: today })
        .eq('organization_id', orgId)
        .eq('email', authUserData.user.email)
        .is('user_id', null)
        .is('end_date', null)
    }
  }

  revalidatePath('/settings/members')
}

export async function cancelInvite(memberId: string): Promise<void> {
  const { orgId } = await getContext()
  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('organization_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single()

  await adminClient
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', orgId)

  if (member?.role === 'resident') {
    const { data: authUserData } = await adminClient.auth.admin.getUserById(member.user_id)
    if (authUserData.user?.email) {
      await adminClient
        .from('unit_owners')
        .update({ end_date: new Date().toISOString().slice(0, 10) })
        .eq('organization_id', orgId)
        .eq('email', authUserData.user.email)
        .is('end_date', null)
    }
  }

  revalidatePath('/settings/members')
}

export async function resendInvite(memberId: string): Promise<string | null> {
  const { orgId } = await getContext()
  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single()

  if (!member) return 'メンバーが見つかりません。'

  const { data: authUserData } = await adminClient.auth.admin.getUserById(member.user_id)
  const email = authUserData.user?.email
  if (!email) return 'メールアドレスが見つかりません。'

  const callbackUrl = await getCallbackUrl()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { organization_id: orgId },
    redirectTo: callbackUrl,
  })

  if (error) return `メールの再送に失敗しました: ${error.message}`
  return null
}
