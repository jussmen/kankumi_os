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

export async function importBankTransactions(params: {
  filename: string
  rows: Array<{
    transaction_date: string
    amount: number
    balance: number | null
    description: string
  }>
}): Promise<{ error: string | null; importId: string | null; count: number }> {
  const { supabase, orgId, userId } = await getContext()

  const { data: mapper } = await supabase
    .from('bank_csv_mappers')
    .select('id')
    .eq('organization_id', orgId)
    .single()

  if (!mapper) {
    return { error: 'CSVマッパーが設定されていません。管理者にお問い合わせください。', importId: null, count: 0 }
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: importRecord, error: importError } = await supabase
    .from('bank_imports')
    .insert({
      organization_id: orgId,
      filename: params.filename,
      import_date: today,
      imported_by: userId,
      mapper_id: mapper.id,
      record_count: 0,
      matched_count: 0,
      unmatched_count: 0,
    })
    .select('id')
    .single()

  if (importError || !importRecord) {
    return { error: `インポート記録の作成に失敗しました: ${importError?.message}`, importId: null, count: 0 }
  }

  const importId = importRecord.id

  const { data: existing } = await supabase
    .from('bank_transactions')
    .select('transaction_date, amount, description')
    .eq('organization_id', orgId)

  const existingSet = new Set(
    (existing ?? []).map(
      (r) => `${r.transaction_date}|${r.amount}|${r.description}`
    )
  )

  const newRows = params.rows.filter(
    (r) => !existingSet.has(`${r.transaction_date}|${r.amount}|${r.description}`)
  )

  if (newRows.length > 0) {
    const inserts = newRows.map((r) => ({
      organization_id: orgId,
      bank_import_id: importId,
      transaction_date: r.transaction_date,
      amount: r.amount,
      balance: r.balance,
      description: r.description,
      status: 'unmatched' as const,
    }))

    const { error: txError } = await supabase.from('bank_transactions').insert(inserts)

    if (txError) {
      return { error: `明細の取り込みに失敗しました: ${txError.message}`, importId: null, count: 0 }
    }
  }

  await supabase
    .from('bank_imports')
    .update({ record_count: newRows.length, unmatched_count: newRows.length })
    .eq('id', importId)

  revalidatePath('/payments/transactions')
  return { error: null, importId, count: newRows.length }
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
