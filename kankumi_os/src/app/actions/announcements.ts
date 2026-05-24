'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { announcementEmail } from '@/lib/email/templates'
import type { Database } from '@/types/database'

type Visibility = Database['public']['Enums']['visibility']

const BOARD_ROLES: Database['public']['Enums']['member_role'][] = [
  'admin',
  'vice_president',
  'treasurer',
  'board_member',
  'auditor',
]

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) redirect('/onboarding')
  return { supabase, orgId: data.organization_id, userId: user.id }
}

export async function createAnnouncement(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const publishedAtRaw = (formData.get('published_at') as string) || null
  const expiresAtRaw = (formData.get('expires_at') as string) || null

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      organization_id: orgId,
      created_by: userId,
      title,
      body: (formData.get('body') as string) ?? '',
      visibility: (formData.get('visibility') as Visibility) || 'all_members',
      published_at: publishedAtRaw || null,
      expires_at: expiresAtRaw || null,
    })
    .select('id')
    .single()

  if (error) return '作成に失敗しました。もう一度お試しください。'

  revalidatePath('/announcements')
  redirect(`/announcements/${data.id}`)
}

export async function updateAnnouncement(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const publishedAtRaw = (formData.get('published_at') as string) || null
  const expiresAtRaw = (formData.get('expires_at') as string) || null

  const { error } = await supabase
    .from('announcements')
    .update({
      title,
      body: (formData.get('body') as string) ?? '',
      visibility: formData.get('visibility') as Visibility,
      published_at: publishedAtRaw || null,
      expires_at: expiresAtRaw || null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '更新に失敗しました。もう一度お試しください。'

  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
  redirect(`/announcements/${id}`)
}

export async function publishAnnouncement(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('announcements')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)

  // メール送信（失敗してもユーザー操作をブロックしない）
  try {
    // お知らせの詳細と組合名を取得
    const [annResult, orgResult] = await Promise.all([
      supabase
        .from('announcements')
        .select('title, body, visibility')
        .eq('id', id)
        .single(),
      supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single(),
    ])

    if (annResult.error || orgResult.error || !annResult.data || !orgResult.data) return

    const { title, body, visibility } = annResult.data
    const orgName = orgResult.data.name

    // 送信対象メンバーを取得
    let membersQuery = supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', orgId)
      .eq('is_active', true)

    const { data: members, error: membersError } = await membersQuery
    if (membersError || !members || members.length === 0) return

    const targetUserIds =
      visibility === 'board_only'
        ? members
            .filter((m) => BOARD_ROLES.includes(m.role))
            .map((m) => m.user_id)
        : members.map((m) => m.user_id)

    if (targetUserIds.length === 0) return

    // admin client でメールアドレスを取得
    const adminClient = createAdminClient()
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })
    if (usersError || !usersData) return

    const emails = usersData.users
      .filter((u) => targetUserIds.includes(u.id) && u.email)
      .map((u) => u.email as string)

    if (emails.length === 0) return

    const html = announcementEmail({ title, body: body ?? '', orgName })
    await sendEmail({ to: emails, subject: `【${orgName}】${title}`, html })
  } catch (err) {
    console.error('[publishAnnouncement] メール送信エラー:', err)
  }
}

export async function unpublishAnnouncement(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('announcements')
    .update({ published_at: null })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/announcements')
  revalidatePath(`/announcements/${id}`)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/announcements')
  redirect('/announcements')
}
