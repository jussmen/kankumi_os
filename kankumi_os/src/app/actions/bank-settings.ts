'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PRESETS = {
  resona: { name: 'りそな銀行', encoding: 'shift-jis' },
  mizuho: { name: 'みずほ銀行', encoding: 'utf-8' },
  'yokohama-bank': { name: '横浜銀行', encoding: 'shift-jis' },
} as const

async function getAdminContext() {
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
  if (data.role !== 'admin') redirect('/settings')

  return { adminClient: createAdminClient(), orgId: data.organization_id }
}

export async function addBankAccount(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { adminClient, orgId } = await getAdminContext()

  const presetKey = (formData.get('preset_key') as string)?.trim()
  const accountLabel = (formData.get('account_label') as string)?.trim() || null

  const preset = PRESETS[presetKey as keyof typeof PRESETS]
  if (!preset) return '銀行を選択してください。'

  const { error } = await adminClient.from('bank_csv_mappers').insert({
    organization_id: orgId,
    bank_name: preset.name,
    preset_key: presetKey,
    encoding: preset.encoding,
    account_label: accountLabel,
    date_column: 0,
    amount_column: 0,
    description_column: 0,
    date_format: 'YYYY-MM-DD',
    skip_rows: 0,
  })

  if (error) return '登録に失敗しました。もう一度お試しください。'

  revalidatePath('/settings/bank-accounts')
  revalidatePath('/payments/import')
  return null
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { adminClient, orgId } = await getAdminContext()
  await adminClient
    .from('bank_csv_mappers')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/settings/bank-accounts')
  revalidatePath('/payments/import')
}
