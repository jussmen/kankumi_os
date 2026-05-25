import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UnitsTable } from '@/components/units/units-table'

interface PageProps {
  searchParams: Promise<{ imported?: string }>
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const { imported } = await searchParams

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
  if (!membership) redirect('/onboarding')

  const { orgId, role } = { orgId: membership.organization_id, role: membership.role }
  const canEdit = ['admin', 'vice_president', 'treasurer'].includes(role)
  const isResident = role === 'resident'

  const REQUIRED_TYPE_ENUMS = ['management_fee', 'reserve_fund']

  // 住民ロールは自分の部屋のみ表示
  let myUnitId: string | null = null
  if (isResident) {
    const { data: myUnit } = await supabase
      .from('unit_owners')
      .select('unit_id')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .is('end_date', null)
      .single()
    myUnitId = myUnit?.unit_id ?? null
  }

  const unitsQuery = supabase
    .from('units')
    .select('id, unit_number, occupancy_status', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('unit_number')

  if (isResident && myUnitId) {
    unitsQuery.eq('id', myUnitId)
  } else if (isResident && !myUnitId) {
    // 部屋未登録の住民は空リストを返す
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">住民台帳</h1>
        <p className="text-sm text-gray-500">部屋が登録されていません。管理者にお問い合わせください。</p>
      </div>
    )
  }

  const [
    { data: units, count },
    { data: orgChargeTypes },
  ] = await Promise.all([
    unitsQuery,
    supabase
      .from('charge_types')
      .select('id, type')
      .eq('organization_id', orgId)
      .eq('is_active', true),
  ])

  const unitIds = (units ?? []).map((u) => u.id)

  const { data: charges } = unitIds.length
    ? await supabase
        .from('unit_charges')
        .select('unit_id, charge_type_id, amount, is_not_applicable')
        .in('unit_id', unitIds)
        .is('effective_to', null)
    : { data: [] }

  const requiredTypeIds = new Set(
    (orgChargeTypes ?? []).filter((ct) => REQUIRED_TYPE_ENUMS.includes(ct.type)).map((ct) => ct.id)
  )
  const optionalTypeIds = new Set(
    (orgChargeTypes ?? []).filter((ct) => !REQUIRED_TYPE_ENUMS.includes(ct.type)).map((ct) => ct.id)
  )

  type ChargeRow = { unit_id: string; charge_type_id: string; amount: number; is_not_applicable: boolean }
  const chargesByUnit = new Map<string, ChargeRow[]>()
  for (const c of charges ?? []) {
    if (!chargesByUnit.has(c.unit_id)) chargesByUnit.set(c.unit_id, [])
    chargesByUnit.get(c.unit_id)!.push(c)
  }

  const tableUnits = (units ?? []).map((u) => {
    const uc = chargesByUnit.get(u.id) ?? []
    const okRequired = new Set(
      uc.filter((c) => requiredTypeIds.has(c.charge_type_id) && !c.is_not_applicable && c.amount > 0)
        .map((c) => c.charge_type_id)
    )
    const okOptional = new Set(
      uc.filter((c) => optionalTypeIds.has(c.charge_type_id) && (c.is_not_applicable || c.amount > 0))
        .map((c) => c.charge_type_id)
    )
    const hasCharge =
      (orgChargeTypes ?? []).length > 0 &&
      okRequired.size === requiredTypeIds.size &&
      okOptional.size === optionalTypeIds.size
    return { ...u, hasCharge }
  })

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">住民台帳</h1>
          {!isResident && (
            <p className="text-sm text-gray-500 mt-0.5">全{count ?? 0}戸</p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href="/units/import"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              CSVインポート
            </Link>
            <Link
              href="/units/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + 追加
            </Link>
          </div>
        )}
      </div>

      {imported && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {imported}件の住民台帳をインポートしました。
        </div>
      )}

      {tableUnits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">住民台帳がまだ登録されていません。</p>
          {canEdit && (
            <div className="flex justify-center gap-3">
              <Link href="/units/import" className="text-sm text-blue-600 hover:underline">
                CSVでまとめて登録
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/units/new" className="text-sm text-blue-600 hover:underline">
                1件ずつ登録
              </Link>
            </div>
          )}
        </div>
      ) : (
        <UnitsTable units={tableUnits} canEdit={canEdit} />
      )}
    </div>
  )
}
