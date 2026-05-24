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
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) redirect('/onboarding')
  return { supabase, orgId: data.organization_id, role: data.role }
}

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer']

export async function upsertBudget(
  fiscalYearId: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, role } = await getContext()
  if (!ALLOWED_ROLES.includes(role)) return '権限がありません。'

  const entries: { category_id: string; budgeted_amount: number }[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('budget_')) {
      const categoryId = key.replace('budget_', '')
      const amount = parseFloat(value as string)
      if (!isNaN(amount) && amount >= 0) {
        entries.push({ category_id: categoryId, budgeted_amount: amount })
      }
    }
  }

  if (entries.length === 0) return null

  const rows = entries.map((e) => ({
    organization_id: orgId,
    fiscal_year_id: fiscalYearId,
    category_id: e.category_id,
    budgeted_amount: e.budgeted_amount,
  }))

  const { error } = await supabase
    .from('budgets')
    .upsert(rows, { onConflict: 'fiscal_year_id,category_id' })

  if (error) return '予算の保存に失敗しました。もう一度お試しください。'

  revalidatePath('/accounting/budget')
  return null
}
