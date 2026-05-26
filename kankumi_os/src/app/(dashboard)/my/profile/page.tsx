import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResidentSetupForm } from '@/components/resident/setup-form'
import { setupResidentProfile } from '@/app/actions/resident-profile'

const CHARGE_TYPE_LABELS: Record<string, string> = {
  management_fee: '管理費',
  reserve_fund: '修繕積立金',
  common_fee: '共益費',
  parking: '駐車場',
  bike_parking: '駐輪場',
  other: 'その他',
}

export default async function ResidentProfilePage() {
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

  const orgId = membership.organization_id

  const { data: ownerRow } = await supabase
    .from('unit_owners')
    .select('id, unit_id, name, name_kana, units(unit_number)')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .is('end_date', null)
    .single()

  if (!ownerRow) redirect('/announcements')

  const unitNumber = (ownerRow.units as { unit_number: string } | null)?.unit_number ?? ''

  const [{ data: chargeTypes }, { data: unitCharges }, { data: existingProfile }] =
    await Promise.all([
      supabase
        .from('charge_types')
        .select('id, type, alias_name')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('unit_charges')
        .select('charge_type_id, amount, is_not_applicable')
        .eq('unit_id', ownerRow.unit_id)
        .eq('organization_id', orgId)
        .is('effective_to', null),
      supabase
        .from('payment_profiles')
        .select('transfer_name, bank_name')
        .eq('unit_id', ownerRow.unit_id)
        .eq('organization_id', orgId)
        .eq('source', 'user')
        .is('effective_to', null)
        .maybeSingle(),
    ])

  const defaultName = ownerRow.name === user.email ? '' : (ownerRow.name ?? '')

  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">住民情報</h1>
        <p className="text-sm text-gray-500 mt-1">{unitNumber}号室</p>
      </div>

      {chargeTypes && chargeTypes.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">月額料金</h2>
          <dl className="space-y-2 text-sm">
            {chargeTypes.map((ct) => {
              const charge = (unitCharges ?? []).find((uc) => uc.charge_type_id === ct.id)
              const label = ct.alias_name ?? CHARGE_TYPE_LABELS[ct.type] ?? ct.type
              return (
                <div key={ct.id} className="flex items-center justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">
                    {charge ? (
                      charge.is_not_applicable ? (
                        <span className="text-xs text-gray-400">利用なし</span>
                      ) : (
                        `${charge.amount.toLocaleString()}円/月`
                      )
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <ResidentSetupForm
          action={setupResidentProfile}
          defaultName={defaultName}
          defaultNameKana={ownerRow.name_kana ?? ''}
          defaultTransferName={existingProfile?.transfer_name ?? ''}
          defaultBankName={existingProfile?.bank_name ?? ''}
        />
      </section>
    </div>
  )
}
