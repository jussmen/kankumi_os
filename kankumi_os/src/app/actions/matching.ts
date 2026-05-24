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
  return { supabase, orgId: data.organization_id, userId: user.id, role: data.role }
}

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer']

function nextMonthStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export async function runAutoMatch(
  yearMonth: string,
  _prevState: { matched: number; error: string | null } | null,
  _formData: FormData
): Promise<{ matched: number; error: string | null }> {
  const { supabase, orgId, role } = await getContext()
  if (!ALLOWED_ROLES.includes(role)) return { matched: 0, error: '権限がありません。' }

  const startDate = `${yearMonth}-01`
  const endDate = nextMonthStart(yearMonth)

  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, transaction_date, amount, description')
    .eq('organization_id', orgId)
    .eq('status', 'unmatched')
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)

  if (!transactions || transactions.length === 0) {
    return { matched: 0, error: null }
  }

  const { data: profiles } = await supabase
    .from('payment_profiles')
    .select('id, unit_id, transfer_name, effective_from, effective_to')
    .eq('organization_id', orgId)

  if (!profiles || profiles.length === 0) {
    return { matched: 0, error: null }
  }

  const { data: charges } = await supabase
    .from('unit_charges')
    .select('unit_id, amount, effective_from, effective_to')
    .eq('organization_id', orgId)

  let matchedCount = 0

  for (const tx of transactions) {
    const txDate = tx.transaction_date
    const descLower = tx.description.toLowerCase()

    const matchedProfile = profiles.find((p) => {
      if (p.effective_from > txDate) return false
      if (p.effective_to && p.effective_to < txDate) return false
      return descLower.includes(p.transfer_name.toLowerCase())
    })

    if (!matchedProfile) continue

    const expectedAmount = (charges ?? [])
      .filter((c) => {
        if (c.unit_id !== matchedProfile.unit_id) return false
        if (c.effective_from > txDate) return false
        if (c.effective_to && c.effective_to < txDate) return false
        return true
      })
      .reduce((sum, c) => sum + Number(c.amount), 0)

    const hasIrregularity = expectedAmount > 0 && Number(tx.amount) !== expectedAmount
    const status = hasIrregularity ? 'irregular' : 'confirmed'

    const { data: paymentRecord } = await supabase
      .from('payment_records')
      .upsert(
        {
          organization_id: orgId,
          unit_id: matchedProfile.unit_id,
          year_month: yearMonth,
          paid_amount: tx.amount,
          status,
          bank_transaction_id: tx.id,
          has_irregularity_flag: hasIrregularity,
        },
        { onConflict: 'organization_id,unit_id,year_month' }
      )
      .select('id')
      .single()

    if (!paymentRecord) continue

    await supabase
      .from('bank_transactions')
      .update({ status: 'matched', matched_payment_id: paymentRecord.id })
      .eq('id', tx.id)

    matchedCount++
  }

  revalidatePath(`/payments/${yearMonth}`)
  revalidatePath(`/payments/${yearMonth}/review`)
  revalidatePath('/payments')
  return { matched: matchedCount, error: null }
}

export async function manualMatch(
  transactionId: string,
  yearMonth: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, role } = await getContext()
  if (!ALLOWED_ROLES.includes(role)) return '権限がありません。'

  const unitId = (formData.get('unit_id') as string)?.trim()
  if (!unitId) return 'Unitを選択してください。'

  const { data: tx } = await supabase
    .from('bank_transactions')
    .select('amount, transaction_date')
    .eq('id', transactionId)
    .eq('organization_id', orgId)
    .single()

  if (!tx) return '明細が見つかりません。'

  const txDate = tx.transaction_date

  const { data: charges } = await supabase
    .from('unit_charges')
    .select('amount, effective_from, effective_to')
    .eq('organization_id', orgId)
    .eq('unit_id', unitId)

  const expectedAmount = (charges ?? [])
    .filter((c) => {
      if (c.effective_from > txDate) return false
      if (c.effective_to && c.effective_to < txDate) return false
      return true
    })
    .reduce((sum, c) => sum + Number(c.amount), 0)

  const hasIrregularity = expectedAmount > 0 && Number(tx.amount) !== expectedAmount
  const status = hasIrregularity ? 'irregular' : 'confirmed'

  const { data: paymentRecord, error: upsertError } = await supabase
    .from('payment_records')
    .upsert(
      {
        organization_id: orgId,
        unit_id: unitId,
        year_month: yearMonth,
        paid_amount: tx.amount,
        status,
        bank_transaction_id: transactionId,
        has_irregularity_flag: hasIrregularity,
      },
      { onConflict: 'organization_id,unit_id,year_month' }
    )
    .select('id')
    .single()

  if (upsertError || !paymentRecord) return '照合の登録に失敗しました。'

  const { error: updateError } = await supabase
    .from('bank_transactions')
    .update({ status: 'matched', matched_payment_id: paymentRecord.id })
    .eq('id', transactionId)
    .eq('organization_id', orgId)

  if (updateError) return '明細ステータスの更新に失敗しました。'

  revalidatePath(`/payments/${yearMonth}`)
  revalidatePath(`/payments/${yearMonth}/review`)
  revalidatePath('/payments')
  return null
}

export async function unmatch(
  transactionId: string,
  paymentRecordId: string,
  yearMonth: string
): Promise<void> {
  const { supabase, orgId, role } = await getContext()
  if (!ALLOWED_ROLES.includes(role)) return

  await supabase
    .from('bank_transactions')
    .update({ status: 'unmatched', matched_payment_id: null })
    .eq('id', transactionId)
    .eq('organization_id', orgId)

  await supabase
    .from('payment_records')
    .update({
      status: 'missing',
      bank_transaction_id: null,
      paid_amount: 0,
      has_irregularity_flag: false,
    })
    .eq('id', paymentRecordId)
    .eq('organization_id', orgId)

  revalidatePath(`/payments/${yearMonth}`)
  revalidatePath(`/payments/${yearMonth}/review`)
  revalidatePath('/payments')
}
