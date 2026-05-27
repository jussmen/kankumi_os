'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const BOARD_ROLES = ['admin', 'vice_president', 'treasurer', 'board_member']

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

export async function createFiscalYear(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const yearStr = (formData.get('year') as string)?.trim()
  const startDate = (formData.get('start_date') as string)?.trim()
  const endDate = (formData.get('end_date') as string)?.trim()

  if (!yearStr || !startDate || !endDate) return '全ての項目を入力してください。'

  const year = parseInt(yearStr, 10)
  if (isNaN(year)) return '年度を正しく入力してください。'

  const { error } = await supabase.from('fiscal_years').insert({
    organization_id: orgId,
    year,
    start_date: startDate,
    end_date: endDate,
    status: 'active',
  })

  if (error) return '会計年度の作成に失敗しました。もう一度お試しください。'

  revalidatePath('/checklist')
  redirect('/checklist')
}

export async function seedChecklistFromTemplates(fiscalYearId: string): Promise<void> {
  const { supabase, orgId } = await getContext()

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('id, label, count')

  if (!templates || templates.length === 0) return

  const items = templates.flatMap((t) => {
    const n = t.count ?? 1
    if (n === 1) {
      return [{ organization_id: orgId, fiscal_year_id: fiscalYearId, template_id: t.id, title: t.label, status: 'pending' }]
    }
    return Array.from({ length: n }, (_, i) => ({
      organization_id: orgId,
      fiscal_year_id: fiscalYearId,
      template_id: t.id,
      title: `${t.label}（${i + 1}回目）`,
      status: 'pending',
    }))
  })

  await supabase.from('annual_checklists').insert(items)

  revalidatePath('/checklist')
}

export async function addChecklistItem(
  fiscalYearId: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const title = (formData.get('title') as string)?.trim()
  if (!title) return 'タイトルを入力してください。'

  const scheduledDate = (formData.get('scheduled_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  const { error } = await supabase.from('annual_checklists').insert({
    organization_id: orgId,
    fiscal_year_id: fiscalYearId,
    title,
    status: 'pending',
    scheduled_date: scheduledDate,
    notes,
  })

  if (error) return '項目の追加に失敗しました。もう一度お試しください。'

  revalidatePath('/checklist')
  return null
}

export async function updateChecklistStatus(id: string, status: string): Promise<void> {
  const { supabase, orgId } = await getContext()

  await supabase
    .from('annual_checklists')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  revalidatePath('/checklist')
  revalidatePath('/calendar')
}

export async function updateChecklistItem(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const scheduledDate = (formData.get('scheduled_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  const { error } = await supabase
    .from('annual_checklists')
    .update({
      scheduled_date: scheduledDate,
      notes,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '更新に失敗しました。もう一度お試しください。'

  revalidatePath('/checklist')
  revalidatePath('/calendar')
  return null
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('annual_checklists')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/checklist')
  revalidatePath('/calendar')
}

export async function createChecklistTemplate(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, role } = await getContext()
  if (!BOARD_ROLES.includes(role)) return '権限がありません。'

  const label = (formData.get('label') as string)?.trim()
  if (!label) return 'テンプレート名を入力してください。'

  const notes = (formData.get('notes') as string)?.trim() || null
  const countRaw = parseInt((formData.get('count') as string) ?? '1', 10)
  const count = isNaN(countRaw) || countRaw < 1 ? 1 : Math.min(countRaw, 52)

  const { error } = await supabase.from('checklist_templates').insert({
    organization_id: orgId,
    key: `custom-${orgId}-${Date.now()}`,
    label,
    default_frequency: 'annual',
    notes,
    count,
  })

  if (error) return 'テンプレートの作成に失敗しました。'

  revalidatePath('/checklist/templates')
  revalidatePath('/checklist')
  return null
}

export async function deleteChecklistTemplate(id: string): Promise<void> {
  const { supabase, orgId, role } = await getContext()
  if (!BOARD_ROLES.includes(role)) return
  await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/checklist/templates')
  revalidatePath('/checklist')
}

export async function deleteAllChecklistItems(fiscalYearId: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('annual_checklists')
    .delete()
    .eq('fiscal_year_id', fiscalYearId)
    .eq('organization_id', orgId)
  revalidatePath('/checklist')
  revalidatePath('/calendar')
}

export async function createTemplatesFromChecklist(
  fiscalYearId: string
): Promise<{ created: number }> {
  const { supabase, orgId, role } = await getContext()
  if (!BOARD_ROLES.includes(role)) return { created: 0 }

  const { data: items } = await supabase
    .from('annual_checklists')
    .select('title, template_id')
    .eq('fiscal_year_id', fiscalYearId)
    .eq('organization_id', orgId)
    .is('template_id', null)

  if (!items || items.length === 0) return { created: 0 }

  // "(N回目)" サフィックスを除いてタイトルをグループ化・カウント
  const titleCount = new Map<string, number>()
  for (const item of items) {
    const base = item.title.replace(/（\d+回目）$/, '').trim()
    titleCount.set(base, (titleCount.get(base) ?? 0) + 1)
  }

  const { data: existing } = await supabase
    .from('checklist_templates')
    .select('label')
    .eq('organization_id', orgId)

  const existingLabels = new Set((existing ?? []).map((t) => t.label))

  const toCreate = [...titleCount.entries()]
    .filter(([label]) => !existingLabels.has(label))
    .map(([label, count], i) => ({
      organization_id: orgId,
      key: `custom-${orgId}-${Date.now()}-${i}`,
      label,
      default_frequency: 'annual',
      count,
    }))

  if (toCreate.length === 0) return { created: 0 }

  await supabase.from('checklist_templates').insert(toCreate)
  revalidatePath('/checklist/templates')
  revalidatePath('/checklist')
  return { created: toCreate.length }
}
