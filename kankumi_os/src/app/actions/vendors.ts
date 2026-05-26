'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type VendorCategory = Database['public']['Enums']['vendor_category']

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

  const role = data.role
  if (role !== 'admin' && role !== 'vice_president') {
    redirect('/settings')
  }

  return { supabase, orgId: data.organization_id, role }
}

// ---- Vendor CRUD ----

export async function createVendor(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return '業者名を入力してください。'

  const category = (formData.get('category') as VendorCategory) || 'other'
  const customCategory = (formData.get('custom_category') as string)?.trim() || null
  const contactName = (formData.get('contact_name') as string)?.trim() || null
  const contactPhone = (formData.get('contact_phone') as string)?.trim() || null
  const contactEmail = (formData.get('contact_email') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const { error } = await supabase.from('vendors').insert({
    organization_id: orgId,
    name,
    category,
    custom_category: customCategory,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    notes,
    is_active: true,
  })

  if (error) return '業者の作成に失敗しました。もう一度お試しください。'

  revalidatePath('/settings/vendors')
  redirect('/settings/vendors')
}

export async function updateVendor(
  id: string,
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return '業者名を入力してください。'

  const category = (formData.get('category') as VendorCategory) || 'other'
  const customCategory = (formData.get('custom_category') as string)?.trim() || null
  const contactName = (formData.get('contact_name') as string)?.trim() || null
  const contactPhone = (formData.get('contact_phone') as string)?.trim() || null
  const contactEmail = (formData.get('contact_email') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  const { error } = await supabase
    .from('vendors')
    .update({
      name,
      category,
      custom_category: customCategory,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      notes,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '業者の更新に失敗しました。もう一度お試しください。'

  revalidatePath('/settings/vendors')
  revalidatePath('/settings/vendors/' + id)
  redirect('/settings/vendors/' + id)
}

export async function deleteVendor(id: string): Promise<{ error: string | null }> {
  const { supabase, orgId } = await getContext()

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: '業者の削除に失敗しました。もう一度お試しください。' }

  revalidatePath('/settings/vendors')
  revalidatePath('/settings/vendors/' + id)
  return { error: null }
}

// ---- Vendor Contract CRUD ----

export async function createVendorContract(
  vendorId: string,
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const serviceDescription = (formData.get('service_description') as string)?.trim()
  if (!serviceDescription) return 'サービス内容を入力してください。'

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const renewalDate = (formData.get('renewal_date') as string) || null
  const autoRenewal = formData.get('auto_renewal') === 'true'
  const costAmountStr = (formData.get('cost_amount') as string)?.trim()
  const costAmount = costAmountStr ? parseFloat(costAmountStr) : null
  const costCycle = (formData.get('cost_cycle') as string) || 'monthly'
  const notes = (formData.get('notes') as string)?.trim() || null

  const { error } = await supabase.from('vendor_contracts').insert({
    organization_id: orgId,
    vendor_id: vendorId,
    service_description: serviceDescription,
    start_date: startDate,
    end_date: endDate,
    renewal_date: renewalDate,
    auto_renewal: autoRenewal,
    cost_amount: costAmount,
    cost_cycle: costCycle,
    notes,
    is_active: true,
  })

  if (error) return '契約の作成に失敗しました。もう一度お試しください。'

  revalidatePath('/settings/vendors')
  revalidatePath('/settings/vendors/' + vendorId)
  return null
}

export async function updateVendorContract(
  id: string,
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const { supabase, orgId } = await getContext()

  const serviceDescription = (formData.get('service_description') as string)?.trim()
  if (!serviceDescription) return 'サービス内容を入力してください。'

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const renewalDate = (formData.get('renewal_date') as string) || null
  const autoRenewal = formData.get('auto_renewal') === 'true'
  const costAmountStr = (formData.get('cost_amount') as string)?.trim()
  const costAmount = costAmountStr ? parseFloat(costAmountStr) : null
  const costCycle = (formData.get('cost_cycle') as string) || 'monthly'
  const notes = (formData.get('notes') as string)?.trim() || null
  const vendorId = (formData.get('vendor_id') as string)?.trim()

  const { error } = await supabase
    .from('vendor_contracts')
    .update({
      service_description: serviceDescription,
      start_date: startDate,
      end_date: endDate,
      renewal_date: renewalDate,
      auto_renewal: autoRenewal,
      cost_amount: costAmount,
      cost_cycle: costCycle,
      notes,
    })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return '契約の更新に失敗しました。もう一度お試しください。'

  revalidatePath('/settings/vendors')
  if (vendorId) revalidatePath('/settings/vendors/' + vendorId)
  return null
}

export async function deleteVendorContract(id: string): Promise<{ error: string | null }> {
  const { supabase, orgId } = await getContext()

  // Get vendor_id before deletion for revalidation
  const { data: contract } = await supabase
    .from('vendor_contracts')
    .select('vendor_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  const { error } = await supabase
    .from('vendor_contracts')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { error: '契約の削除に失敗しました。もう一度お試しください。' }

  revalidatePath('/settings/vendors')
  if (contract?.vendor_id) revalidatePath('/settings/vendors/' + contract.vendor_id)
  return { error: null }
}
