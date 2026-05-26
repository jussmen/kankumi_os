'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setupResidentProfile(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) return '権限がありません。'

  const orgId = membership.organization_id

  const { data: ownerRow } = await supabase
    .from('unit_owners')
    .select('id, unit_id')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .is('end_date', null)
    .single()

  if (!ownerRow) return '部屋番号が登録されていません。管理者にお問い合わせください。'

  const name = (formData.get('name') as string)?.trim()
  const name_kana = (formData.get('name_kana') as string)?.trim()
  const transfer_name = (formData.get('transfer_name') as string)?.trim()
  const bank_name = (formData.get('bank_name') as string)?.trim()

  if (!name) return '氏名を入力してください。'
  if (!name_kana) return '氏名（カナ）を入力してください。'
  if (!transfer_name) return '振込名義を入力してください。'
  if (!bank_name) return '銀行名を入力してください。'

  const { error: ownerError } = await supabase
    .from('unit_owners')
    .update({ name, name_kana, charge_confirmed_at: new Date().toISOString() })
    .eq('id', ownerRow.id)

  if (ownerError) return 'プロフィールの更新に失敗しました。'

  const today = new Date().toISOString().slice(0, 10)

  await supabase
    .from('payment_profiles')
    .update({ effective_to: today })
    .eq('unit_id', ownerRow.unit_id)
    .eq('organization_id', orgId)
    .eq('source', 'user')
    .is('effective_to', null)

  const { error: profileError } = await supabase.from('payment_profiles').insert({
    organization_id: orgId,
    unit_id: ownerRow.unit_id,
    source: 'user',
    transfer_name,
    bank_name,
    effective_from: today,
    created_by: user.id,
  })

  if (profileError) return '振込情報の登録に失敗しました。'

  revalidatePath('/my/profile')
  redirect('/announcements')
}
