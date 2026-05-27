'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAutoMatching } from '@/lib/bank-csv/matching'
import type { ParsedRow } from '@/lib/bank-csv/parsers'

const IMPORT_ROLES = ['admin', 'vice_president', 'treasurer']

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

export async function importBankTransactions(params: {
  mapperId: string
  filename: string
  rows: ParsedRow[]
}): Promise<{ error: string | null; matched: number; unmatched: number; skipped: number }> {
  const { supabase, orgId, userId, role } = await getContext()

  if (!IMPORT_ROLES.includes(role)) {
    return { error: '権限がありません。', matched: 0, unmatched: 0, skipped: 0 }
  }

  const { data: mapper } = await supabase
    .from('bank_csv_mappers')
    .select('id')
    .eq('id', params.mapperId)
    .eq('organization_id', orgId)
    .single()

  if (!mapper) {
    return { error: 'マッパーが見つかりません。', matched: 0, unmatched: 0, skipped: 0 }
  }

  const { data: existing } = await supabase
    .from('bank_transactions')
    .select('transaction_date, amount, description')
    .eq('organization_id', orgId)

  const existingSet = new Set(
    (existing ?? []).map(r => `${r.transaction_date}|${r.amount}|${r.description}`)
  )

  const newRows = params.rows.filter(
    r => !existingSet.has(`${r.transaction_date}|${r.amount}|${r.description}`)
  )
  const skipped = params.rows.length - newRows.length

  if (newRows.length === 0) {
    return { error: null, matched: 0, unmatched: 0, skipped }
  }

  const { data: importRecord, error: importError } = await supabase
    .from('bank_imports')
    .insert({
      organization_id: orgId,
      filename: params.filename,
      import_date: new Date().toISOString().slice(0, 10),
      imported_by: userId,
      mapper_id: mapper.id,
      record_count: newRows.length,
      matched_count: 0,
      unmatched_count: newRows.length,
    })
    .select('id')
    .single()

  if (importError || !importRecord) {
    return { error: 'インポート記録の作成に失敗しました。', matched: 0, unmatched: 0, skipped }
  }

  const { error: txError } = await supabase.from('bank_transactions').insert(
    newRows.map(r => ({
      organization_id: orgId,
      bank_import_id: importRecord.id,
      transaction_date: r.transaction_date,
      amount: r.amount,
      balance: r.balance,
      description: r.description,
      status: 'unmatched' as const,
    }))
  )

  if (txError) {
    return { error: `明細の取り込みに失敗しました: ${txError.message}`, matched: 0, unmatched: 0, skipped }
  }

  const { matched, unmatched } = await runAutoMatching(supabase, orgId, importRecord.id)

  revalidatePath('/payments')
  revalidatePath('/payments/transactions')
  return { error: null, matched, unmatched, skipped }
}

export async function ignoreTransaction(id: string): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('bank_transactions')
    .update({ status: 'ignored' })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/payments/transactions')
}

export async function manualMatchTransaction(
  txId: string,
  unitId: string,
  yearMonth: string
): Promise<{ error: string | null }> {
  const { supabase, orgId, role } = await getContext()

  if (!IMPORT_ROLES.includes(role)) return { error: '権限がありません。' }

  const { data: tx } = await supabase
    .from('bank_transactions')
    .select('id, amount, status')
    .eq('id', txId)
    .eq('organization_id', orgId)
    .single()

  if (!tx) return { error: '明細が見つかりません。' }
  if (tx.status !== 'unmatched') return { error: 'この明細はすでに照合済みです。' }

  const { data: collision } = await supabase
    .from('payment_records')
    .select('id')
    .eq('organization_id', orgId)
    .eq('unit_id', unitId)
    .eq('year_month', yearMonth)
    .maybeSingle()

  if (collision) return { error: 'この部屋・この月はすでに照合済みです。' }

  const { data: charges } = await supabase
    .from('unit_charges')
    .select('amount')
    .eq('organization_id', orgId)
    .eq('unit_id', unitId)
    .is('effective_to', null)
    .eq('is_not_applicable', false)

  const expected = (charges ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const payStatus = expected > 0 && Math.abs(Number(tx.amount) - expected) < 1 ? 'confirmed' : 'irregular'

  const { data: record } = await supabase
    .from('payment_records')
    .insert({
      organization_id: orgId,
      unit_id: unitId,
      year_month: yearMonth,
      paid_amount: tx.amount,
      status: payStatus,
      bank_transaction_id: txId,
      has_irregularity_flag: payStatus === 'irregular',
    })
    .select('id')
    .single()

  if (!record) return { error: '照合記録の作成に失敗しました。' }

  await supabase
    .from('bank_transactions')
    .update({ status: 'matched', matched_payment_id: record.id })
    .eq('id', txId)

  revalidatePath('/payments')
  revalidatePath('/payments/transactions')
  return { error: null }
}
