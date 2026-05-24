'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Visibility = Database['public']['Enums']['visibility']

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
