'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

export async function createTask(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: orgId,
      created_by: userId,
      title,
      status: 'todo',
      due_date: (formData.get('due_date') as string) || null,
      topic_id: (formData.get('topic_id') as string) || null,
    })
    .select('id')
    .single()

  if (error) return '作成に失敗しました。もう一度お試しください。'

  revalidatePath('/tasks')
  if (data.id) redirect(`/tasks/${data.id}`)
  return null
}

export async function updateTask(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const status = (formData.get('status') as string) || 'todo'
  const completed_at =
    status === 'done'
      ? new Date().toISOString()
      : null

  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      status,
      due_date: (formData.get('due_date') as string) || null,
      topic_id: (formData.get('topic_id') as string) || null,
      completed_at,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '更新に失敗しました。もう一度お試しください。'

  revalidatePath('/tasks')
  revalidatePath(`/tasks/${id}`)
  redirect(`/tasks/${id}`)
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  const completed_at = status === 'done' ? new Date().toISOString() : null
  await supabase
    .from('tasks')
    .update({ status, completed_at })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath(`/tasks/${id}`)
  revalidatePath('/tasks')
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase.from('tasks').delete().eq('id', id).eq('organization_id', orgId)
  revalidatePath('/tasks')
  redirect('/tasks')
}
