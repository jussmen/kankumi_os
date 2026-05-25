'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type ChargeTypeEnum = Database['public']['Enums']['charge_type_enum']

const OPTIONAL_TYPES: ChargeTypeEnum[] = ['common_fee', 'parking', 'bike_parking', 'other']

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
  return { supabase, orgId: data.organization_id }
}

export async function updateChargeTypes(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getAdminContext()

  const otherAlias = (formData.get('charge_type_other_alias') as string)?.trim() || null

  const { data: existing } = await supabase
    .from('charge_types')
    .select('id, type, is_active')
    .eq('organization_id', orgId)
    .order('created_at')

  // type ごとに最初のレコードを使う（重複防止）
  const existingMap = new Map<ChargeTypeEnum, { id: string; is_active: boolean }>()
  for (const ct of existing ?? []) {
    if (!existingMap.has(ct.type as ChargeTypeEnum)) {
      existingMap.set(ct.type as ChargeTypeEnum, { id: ct.id, is_active: ct.is_active })
    }
  }

  for (const type of OPTIONAL_TYPES) {
    const isSelected = formData.get(`charge_type_${type}`) === 'on'
    const current = existingMap.get(type)
    const alias = type === 'other' ? otherAlias : null

    if (isSelected) {
      if (!current) {
        const { error } = await supabase.from('charge_types').insert({
          organization_id: orgId,
          type,
          alias_name: alias,
          is_active: true,
        })
        if (error) return '費用項目の追加に失敗しました。'
      } else if (!current.is_active) {
        await supabase
          .from('charge_types')
          .update({ is_active: true, alias_name: alias })
          .eq('id', current.id)
      } else if (type === 'other') {
        await supabase
          .from('charge_types')
          .update({ alias_name: alias })
          .eq('id', current.id)
      }
    } else if (current?.is_active) {
      await supabase
        .from('charge_types')
        .update({ is_active: false })
        .eq('id', current.id)
    }
  }

  revalidatePath('/settings/charge-types')
  revalidatePath('/units', 'layout')
  return null
}
