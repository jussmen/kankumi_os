'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type AccountType = Database['public']['Enums']['account_type']

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

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer']

export async function createExpense(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId, role } = await getContext()

  if (!ALLOWED_ROLES.includes(role)) return '権限がありません。'

  const fiscalYearId = (formData.get('fiscal_year_id') as string)?.trim()
  const expenseDate = (formData.get('expense_date') as string)?.trim()
  const amountRaw = formData.get('amount') as string
  const categoryId = (formData.get('category_id') as string)?.trim()
  const vendor = (formData.get('vendor') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const receiptUrl = (formData.get('receipt_url') as string)?.trim() || null

  if (!fiscalYearId) return '会計年度が選択されていません。'
  if (!expenseDate) return '支出日を入力してください。'
  if (!categoryId) return '科目を選択してください。'

  const amount = parseFloat(amountRaw)
  if (!amountRaw || isNaN(amount) || amount <= 0) return '金額を正しく入力してください。'

  const { error } = await supabase.from('expenses').insert({
    organization_id: orgId,
    fiscal_year_id: fiscalYearId,
    expense_date: expenseDate,
    amount,
    category_id: categoryId,
    vendor,
    description,
    receipt_url: receiptUrl,
    created_by: userId,
  })

  if (error) return '支出の登録に失敗しました。もう一度お試しください。'

  revalidatePath('/accounting/expenses')
  redirect('/accounting/expenses')
}

export async function updateExpense(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, role } = await getContext()

  if (!ALLOWED_ROLES.includes(role)) return '権限がありません。'

  const expenseDate = (formData.get('expense_date') as string)?.trim()
  const amountRaw = formData.get('amount') as string
  const categoryId = (formData.get('category_id') as string)?.trim()
  const vendor = (formData.get('vendor') as string)?.trim() || null
  const description = (formData.get('description') as string)?.trim() || null
  const receiptUrl = (formData.get('receipt_url') as string)?.trim() || null

  if (!expenseDate) return '支出日を入力してください。'
  if (!categoryId) return '科目を選択してください。'

  const amount = parseFloat(amountRaw)
  if (!amountRaw || isNaN(amount) || amount <= 0) return '金額を正しく入力してください。'

  const { error } = await supabase
    .from('expenses')
    .update({
      expense_date: expenseDate,
      amount,
      category_id: categoryId,
      vendor,
      description,
      receipt_url: receiptUrl,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '支出の更新に失敗しました。もう一度お試しください。'

  revalidatePath('/accounting/expenses')
  revalidatePath(`/accounting/expenses/${id}`)
  redirect(`/accounting/expenses/${id}`)
}

export async function deleteExpense(id: string): Promise<void> {
  const { supabase, orgId, role } = await getContext()

  if (!ALLOWED_ROLES.includes(role)) return

  await supabase.from('expenses').delete().eq('id', id).eq('organization_id', orgId)

  revalidatePath('/accounting/expenses')
  redirect('/accounting/expenses')
}

export async function createExpenseCategory(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, role } = await getContext()

  if (!ALLOWED_ROLES.includes(role)) return '権限がありません。'

  const name = (formData.get('name') as string)?.trim()
  const accountType = (formData.get('account_type') as string)?.trim() as AccountType

  if (!name) return '科目名を入力してください。'
  if (!accountType || !['management', 'reserve_fund'].includes(accountType)) {
    return '会計区分を選択してください。'
  }

  const { error } = await supabase.from('expense_categories').insert({
    organization_id: orgId,
    name,
    account_type: accountType,
    is_template: false,
    is_active: true,
  })

  if (error) return '科目の登録に失敗しました。もう一度お試しください。'

  revalidatePath('/accounting/categories')
  return null
}
