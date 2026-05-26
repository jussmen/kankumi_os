'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type TopicStatus = Database['public']['Enums']['topic_status']
type TopicType = Database['public']['Enums']['topic_type']
type Priority = Database['public']['Enums']['priority']
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

export async function createTopic(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const { data, error } = await supabase
    .from('topics')
    .insert({
      organization_id: orgId,
      created_by: userId,
      title,
      body: (formData.get('body') as string) ?? '',
      type: (formData.get('type') as TopicType) || 'general',
      status: 'open',
      priority: (formData.get('priority') as Priority) || 'normal',
      visibility: (formData.get('visibility') as Visibility) || 'board_only',
      due_date: (formData.get('due_date') as string) || null,
    })
    .select('id')
    .single()

  if (error) return '作成に失敗しました。もう一度お試しください。'

  revalidatePath('/topics')
  redirect(`/topics/${data.id}`)
}

export async function updateTopic(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const { error } = await supabase
    .from('topics')
    .update({
      title,
      body: (formData.get('body') as string) ?? '',
      type: formData.get('type') as TopicType,
      status: formData.get('status') as TopicStatus,
      priority: formData.get('priority') as Priority,
      visibility: formData.get('visibility') as Visibility,
      due_date: (formData.get('due_date') as string) || null,
      resolution: (formData.get('resolution') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '更新に失敗しました。もう一度お試しください。'

  revalidatePath('/topics')
  revalidatePath(`/topics/${id}`)
  redirect(`/topics/${id}`)
}

export async function updateTopicStatus(
  id: string,
  status: TopicStatus,
  resolution?: string
): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('topics')
    .update({
      status,
      ...(resolution !== undefined ? { resolution: resolution || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath(`/topics/${id}`)
  revalidatePath('/topics')
}

export async function resolveTopicWithNote(
  id: string,
  resolution: string,
  targetStatus: 'resolved' | 'closed' = 'resolved'
): Promise<{ error: string | null }> {
  const { supabase, orgId } = await getContext()
  const { error } = await supabase
    .from('topics')
    .update({
      status: targetStatus,
      resolution: resolution || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', orgId)
  if (error) return { error: '更新に失敗しました。もう一度お試しください。' }
  revalidatePath(`/topics/${id}`)
  revalidatePath('/topics')
  return { error: null }
}

export async function togglePin(id: string, pinned: boolean): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('topics')
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/topics')
  revalidatePath(`/topics/${id}`)
}

export async function addComment(
  topicId: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const body = (formData.get('body') as string)?.trim()
  if (!body) return 'コメントを入力してください。'

  const { error } = await supabase.from('comments').insert({
    organization_id: orgId,
    topic_id: topicId,
    author_id: userId,
    body,
  })

  if (error) return 'コメントの投稿に失敗しました。'

  revalidatePath(`/topics/${topicId}`)
  return null
}

export async function updateComment(
  id: string,
  topicId: string,
  body: string
): Promise<{ error: string | null }> {
  const { supabase, orgId, userId } = await getContext()

  const { error } = await supabase
    .from('comments')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .eq('author_id', userId)

  if (error) return { error: '編集に失敗しました。' }

  revalidatePath(`/topics/${topicId}`)
  return { error: null }
}

export async function deleteComment(id: string, topicId: string): Promise<void> {
  const { supabase, orgId, userId } = await getContext()
  await supabase
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
    .eq('author_id', userId)
  revalidatePath(`/topics/${topicId}`)
}
