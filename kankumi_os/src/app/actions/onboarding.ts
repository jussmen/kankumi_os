'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type ChargeTypeEnum = Database['public']['Enums']['charge_type_enum']

export async function createOrganization(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 既にオンボーディング済みか確認
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (existingMembership) {
    redirect('/dashboard')
  }

  // Step 1: 組合基本情報
  const name = (formData.get('name') as string)?.trim()
  const address = (formData.get('address') as string)?.trim() || null
  const unitCountRaw = formData.get('unit_count') as string
  const fiscalYearStartRaw = formData.get('fiscal_year_start') as string

  if (!name) {
    return 'マンション名を入力してください。'
  }

  const unitCount = parseInt(unitCountRaw, 10)
  if (isNaN(unitCount) || unitCount < 1) {
    return '戸数は1以上の数値を入力してください。'
  }

  const fiscalYearStart = parseInt(fiscalYearStartRaw, 10)
  if (isNaN(fiscalYearStart) || fiscalYearStart < 1 || fiscalYearStart > 12) {
    return '会計年度開始月が不正です。'
  }

  const adminClient = createAdminClient()

  // organizations に挿入
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name,
      address,
      unit_count: unitCount,
      fiscal_year_start: fiscalYearStart,
    })
    .select('id')
    .single()

  if (orgError || !org) {
    return '組合の作成に失敗しました。もう一度お試しください。'
  }

  const organizationId = org.id

  // organization_members に挿入（admin ロール）
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      role: 'admin',
      is_active: true,
    })

  if (memberError) {
    return 'メンバー登録に失敗しました。もう一度お試しください。'
  }

  // Step 2: 費用項目
  const requiredTypes: ChargeTypeEnum[] = ['management_fee', 'reserve_fund']
  const optionalTypes: ChargeTypeEnum[] = [
    'common_fee',
    'parking',
    'bike_parking',
    'other',
  ]

  const selectedOptional = optionalTypes.filter(
    (t) => formData.get(`charge_type_${t}`) === 'on'
  )

  const allChargeTypes = [...requiredTypes, ...selectedOptional]

  const chargeTypeInserts = allChargeTypes.map((type) => {
    const aliasName =
      type === 'other'
        ? (formData.get('charge_type_other_alias') as string)?.trim() || null
        : null
    return {
      organization_id: organizationId,
      type,
      alias_name: aliasName,
      is_active: true,
    }
  })

  const { error: chargeError } = await adminClient
    .from('charge_types')
    .insert(chargeTypeInserts)

  if (chargeError) {
    return '費用項目の設定に失敗しました。もう一度お試しください。'
  }

  // Step 3: 銀行CSV設定
  const bankPreset = formData.get('bank_preset') as string

  if (bankPreset === 'resona') {
    const { error: bankError } = await adminClient
      .from('bank_csv_mappers')
      .insert({
        organization_id: organizationId,
        bank_name: 'りそな銀行',
        preset_key: 'resona',
        encoding: 'shift-jis',
        date_column: 0,
        amount_column: 3,
        description_column: 1,
        date_format: 'YYYY/MM/DD',
        skip_rows: 1,
      })

    if (bankError) {
      return '銀行CSV設定の保存に失敗しました。もう一度お試しください。'
    }
  }

  redirect('/dashboard')
}
