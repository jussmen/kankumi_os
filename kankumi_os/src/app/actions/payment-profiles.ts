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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function registerPaymentProfile(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId } = await getContext()

  const { data: ownerRow } = await supabase
    .from('unit_owners')
    .select('unit_id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .is('end_date', null)
    .single()

  if (!ownerRow) {
    return '部屋番号が登録されていません。管理者にお問い合わせください。'
  }

  const unitId = ownerRow.unit_id
  const effectiveFrom = today()

  await supabase
    .from('payment_profiles')
    .update({ effective_to: effectiveFrom })
    .eq('unit_id', unitId)
    .eq('organization_id', orgId)
    .eq('source', 'user')
    .is('effective_to', null)

  const { error } = await supabase.from('payment_profiles').insert({
    organization_id: orgId,
    unit_id: unitId,
    source: 'user',
    transfer_name: (formData.get('transfer_name') as string).trim(),
    bank_name: (formData.get('bank_name') as string).trim(),
    effective_from: effectiveFrom,
    created_by: userId,
  })

  if (error) return '登録に失敗しました。もう一度お試しください。'

  revalidatePath('/my/payment-profile')
  return null
}

export async function adminSetPaymentProfile(
  unitId: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId, userId, role } = await getContext()

  if (!['admin', 'vice_president', 'treasurer'].includes(role)) {
    return '権限がありません。'
  }

  const effectiveFrom = today()

  await supabase
    .from('payment_profiles')
    .update({ effective_to: effectiveFrom })
    .eq('unit_id', unitId)
    .eq('organization_id', orgId)
    .eq('source', 'admin')
    .is('effective_to', null)

  const { error } = await supabase.from('payment_profiles').insert({
    organization_id: orgId,
    unit_id: unitId,
    source: 'admin',
    transfer_name: (formData.get('transfer_name') as string).trim(),
    bank_name: (formData.get('bank_name') as string).trim(),
    effective_from: effectiveFrom,
    created_by: userId,
  })

  if (error) return '振込情報の設定に失敗しました。もう一度お試しください。'

  revalidatePath('/units/' + unitId)
  return null
}
