'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) redirect('/onboarding')
  return { supabase, orgId: data.organization_id }
}

function parseFloor(raw: string): number | null {
  const n = parseInt(raw, 10)
  return raw && !isNaN(n) ? n : null
}

function parseArea(raw: string): number | null {
  const n = parseFloat(raw)
  return raw && !isNaN(n) ? n : null
}

export async function createUnit(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const unitNumber = (formData.get('unit_number') as string)?.trim()
  if (!unitNumber) return '部屋番号を入力してください。'

  const { error } = await supabase.from('units').insert({
    organization_id: orgId,
    unit_number: unitNumber,
    floor: parseFloor(formData.get('floor') as string),
    area_sqm: parseArea(formData.get('area_sqm') as string),
    occupancy_status: (formData.get('occupancy_status') as OccupancyStatus) || 'occupied',
  })

  if (error) {
    if (error.code === '23505') return 'この部屋番号はすでに登録されています。'
    return '追加に失敗しました。もう一度お試しください。'
  }

  revalidatePath('/units')
  redirect('/units')
}

export async function updateUnit(
  id: string,
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const unitNumber = (formData.get('unit_number') as string)?.trim()
  if (!unitNumber) return '部屋番号を入力してください。'

  const { error } = await supabase
    .from('units')
    .update({
      unit_number: unitNumber,
      floor: parseFloor(formData.get('floor') as string),
      area_sqm: parseArea(formData.get('area_sqm') as string),
      occupancy_status: formData.get('occupancy_status') as OccupancyStatus,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    if (error.code === '23505') return 'この部屋番号はすでに登録されています。'
    return '更新に失敗しました。もう一度お試しください。'
  }

  revalidatePath('/units')
  revalidatePath(`/units/${id}`)
  redirect(`/units/${id}`)
}

export async function updateOccupancyStatus(
  id: string,
  status: OccupancyStatus
): Promise<void> {
  const { supabase, orgId } = await getContext()
  await supabase
    .from('units')
    .update({ occupancy_status: status })
    .eq('id', id)
    .eq('organization_id', orgId)
  revalidatePath('/units')
}

export async function importUnits(
  rows: Array<{
    unit_number: string
    floor: number | null
    area_sqm: number | null
    occupancy_status: OccupancyStatus
  }>
): Promise<{ error: string | null; count: number }> {
  const { supabase, orgId } = await getContext()

  const inserts = rows.map((row) => ({ organization_id: orgId, ...row }))

  const { data, error } = await supabase
    .from('units')
    .upsert(inserts, { onConflict: 'organization_id,unit_number' })
    .select('id')

  if (error) return { error: `インポートに失敗しました: ${error.message}`, count: 0 }

  revalidatePath('/units')
  return { error: null, count: data?.length ?? 0 }
}

export async function upsertUnitCharge(
  unitId: string,
  chargeTypeId: string,
  amount: number,
  effectiveFrom: string
): Promise<{ error: string | null }> {
  const { supabase, orgId } = await getContext()

  await supabase
    .from('unit_charges')
    .update({ effective_to: effectiveFrom })
    .eq('unit_id', unitId)
    .eq('charge_type_id', chargeTypeId)
    .eq('organization_id', orgId)
    .is('effective_to', null)

  const { error } = await supabase.from('unit_charges').insert({
    organization_id: orgId,
    unit_id: unitId,
    charge_type_id: chargeTypeId,
    amount,
    effective_from: effectiveFrom,
  })

  if (error) return { error: '月額料金の設定に失敗しました。' }

  revalidatePath(`/units/${unitId}`)
  return { error: null }
}
