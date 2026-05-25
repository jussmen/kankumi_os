import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateUnit } from '@/app/actions/units'
import { adminSetPaymentProfile } from '@/app/actions/payment-profiles'
import { UnitForm } from '@/components/units/unit-form'
import { UnitChargesForm } from '@/components/units/unit-charges-form'
import { PaymentProfileForm } from '@/components/payment-profiles/payment-profile-form'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']

const OCCUPANCY_STYLES: Record<OccupancyStatus, { label: string; className: string }> = {
  occupied: { label: '居住中', className: 'bg-green-100 text-green-700' },
  vacant: { label: '空室', className: 'bg-yellow-100 text-yellow-700' },
  excluded: { label: '対象外', className: 'bg-gray-100 text-gray-500' },
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  management_fee: '管理費',
  reserve_fund: '修繕積立金',
  common_fee: '共益費',
  parking: '駐車場',
  bike_parking: '駐輪場',
  other: 'その他',
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function UnitDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

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

  // Unit
  const { data: unit } = await supabase
    .from('units')
    .select('id, unit_number, occupancy_status')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!unit) notFound()

  // ChargeTypes（組合の全費用項目）
  const { data: chargeTypes } = await supabase
    .from('charge_types')
    .select('id, type, alias_name')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('created_at')

  // UnitCharges（現在有効）
  const { data: unitCharges } = await supabase
    .from('unit_charges')
    .select('id, charge_type_id, amount, effective_from, is_not_applicable')
    .eq('unit_id', id)
    .eq('organization_id', orgId)
    .is('effective_to', null)
    .order('effective_from', { ascending: false })

  // PaymentProfiles（現在有効）
  const { data: profiles } = await supabase
    .from('payment_profiles')
    .select('id, source, transfer_name, bank_name, account_last4, effective_from')
    .eq('unit_id', id)
    .eq('organization_id', orgId)
    .is('effective_to', null)
    .order('effective_from', { ascending: false })

  const userProfile = (profiles ?? []).find((p) => p.source === 'user')
  const adminProfile = (profiles ?? []).find((p) => p.source === 'admin')

  const occ = OCCUPANCY_STYLES[unit.occupancy_status]
  const isEditing = edit === '1' && canEdit

  const updateUnitWithId = updateUnit.bind(null, id)

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/units" className="text-sm text-gray-500 hover:text-gray-700">
          ← 住民台帳
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          部屋 {unit.unit_number}
        </h1>
      </div>

      {/* 基本情報 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">基本情報</h2>
          {canEdit && !isEditing && (
            <Link
              href={`/units/${id}?edit=1`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              編集
            </Link>
          )}
        </div>

        {isEditing ? (
          <UnitForm
            action={updateUnitWithId}
            defaultValues={unit}
            submitLabel="更新"
            cancelHref={`/units/${id}`}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">部屋番号</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{unit.unit_number}</dd>
            </div>
            <div>
              <dt className="text-gray-500">入居状態</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${occ.className}`}
                >
                  {occ.label}
                </span>
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* 月額料金 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-4">月額料金</h2>
        {canEdit ? (
          chargeTypes && chargeTypes.length > 0 ? (
            <UnitChargesForm
              unitId={id}
              chargeTypes={chargeTypes.map((ct) => ({
                id: ct.id,
                type: ct.type,
                alias_name: ct.alias_name,
              }))}
              currentCharges={(unitCharges ?? []).map((uc) => ({
                id: uc.id,
                charge_type_id: uc.charge_type_id,
                amount: uc.amount,
                effective_from: uc.effective_from,
                is_not_applicable: uc.is_not_applicable ?? false,
              }))}
            />
          ) : (
            <p className="text-sm text-gray-500">
              費用項目が設定されていません。
              <Link href="/settings/charge-types" className="ml-1 text-blue-600 hover:underline">
                費用項目の管理
              </Link>
              から追加してください。
            </p>
          )
        ) : (
          <dl className="space-y-2 text-sm">
            {(chargeTypes ?? []).map((ct) => {
              const charge = (unitCharges ?? []).find(
                (uc) => uc.charge_type_id === ct.id
              )
              const label = ct.alias_name ?? CHARGE_TYPE_LABELS[ct.type] ?? ct.type
              return (
                <div key={ct.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                  <dt className="text-gray-600">{label}</dt>
                  <dd className="font-medium text-gray-900">
                    {charge
                      ? charge.is_not_applicable
                        ? <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">利用なし</span>
                        : `${charge.amount.toLocaleString()}円/月`
                      : '—'}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">振込情報</h2>
        <div className="space-y-4 text-sm mb-4">
          <ProfileRow
            label="住民の振込情報"
            profile={userProfile ?? null}
          />
          <ProfileRow
            label="管理者の振込情報"
            profile={adminProfile ?? null}
          />
        </div>
        {canEdit && (
          <>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-3">管理者として振込情報を設定</p>
              <PaymentProfileForm
                action={adminSetPaymentProfile.bind(null, id)}
                submitLabel="設定する"
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function ProfileRow({
  label,
  profile,
}: {
  label: string
  profile: {
    transfer_name: string
    bank_name: string
    account_last4: string
    effective_from: string
  } | null
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span
        className={`mt-0.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${profile ? 'bg-green-500' : 'bg-gray-200'}`}
      />
      <div>
        <p className="font-medium text-gray-700">{label}</p>
        {profile ? (
          <p className="text-gray-500 mt-0.5">
            {profile.transfer_name}・{profile.bank_name}・下4桁 {profile.account_last4}
          </p>
        ) : (
          <p className="text-gray-400 mt-0.5">未登録</p>
        )}
      </div>
    </div>
  )
}
