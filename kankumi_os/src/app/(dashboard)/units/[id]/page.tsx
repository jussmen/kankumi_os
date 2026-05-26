import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateUnit, inviteResidentToUnit, moveOutResident } from '@/app/actions/units'
import { adminSetPaymentProfile, clearAdminPaymentProfile } from '@/app/actions/payment-profiles'
import { UnitForm } from '@/components/units/unit-form'
import { UnitChargesForm } from '@/components/units/unit-charges-form'
import { UnitInviteForm } from '@/components/units/unit-invite-form'
import { MoveOutButton } from '@/components/units/move-out-button'
import { PaymentProfileForm } from '@/components/payment-profiles/payment-profile-form'
import { ClearAdminProfileButton } from '@/components/payment-profiles/clear-admin-profile-button'
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

  const [
    { data: unit },
    { data: chargeTypes },
    { data: unitCharges },
    { data: profiles },
    { data: profileHistory },
    { data: currentOwner },
  ] = await Promise.all([
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('charge_types')
      .select('id, type, alias_name')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('unit_charges')
      .select('id, charge_type_id, amount, effective_from, is_not_applicable')
      .eq('unit_id', id)
      .eq('organization_id', orgId)
      .is('effective_to', null)
      .order('effective_from', { ascending: false }),
    supabase
      .from('payment_profiles')
      .select('id, source, transfer_name, bank_name, effective_from')
      .eq('unit_id', id)
      .eq('organization_id', orgId)
      .is('effective_to', null)
      .order('effective_from', { ascending: false }),
    supabase
      .from('payment_profiles')
      .select('id, source, transfer_name, bank_name, effective_from, effective_to')
      .eq('unit_id', id)
      .eq('organization_id', orgId)
      .not('effective_to', 'is', null)
      .order('effective_to', { ascending: false })
      .limit(10),
    supabase
      .from('unit_owners')
      .select('id, name, name_kana, email, user_id, charge_confirmed_at')
      .eq('unit_id', id)
      .eq('organization_id', orgId)
      .is('end_date', null)
      .maybeSingle(),
  ])

  if (!unit) notFound()

  const userProfile = (profiles ?? []).find((p) => p.source === 'user')
  const adminProfile = (profiles ?? []).find((p) => p.source === 'admin')

  const isEditing = edit === '1' && canEdit
  const isConfirmed = !!currentOwner?.charge_confirmed_at

  const updateUnitWithId = updateUnit.bind(null, id)
  const inviteAction = inviteResidentToUnit.bind(null, id)

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
            <Link href={`/units/${id}?edit=1`} className="text-sm text-blue-600 hover:text-blue-800">
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
          <dl className="text-sm">
            <div>
              <dt className="text-gray-500">部屋番号</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{unit.unit_number}</dd>
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
              chargeTypes={chargeTypes.map((ct) => ({ id: ct.id, type: ct.type, alias_name: ct.alias_name }))}
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
              const charge = (unitCharges ?? []).find((uc) => uc.charge_type_id === ct.id)
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

      {/* 住民 */}
      {canEdit && (
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-800 mb-4">住民</h2>

          {currentOwner ? (
            <div className="mb-4 text-sm space-y-2">
              <div className="flex items-center gap-3">
                {isConfirmed ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">台帳有効</span>
                ) : currentOwner.user_id ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">要確認</span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">招待中</span>
                )}
                <span className="text-gray-700">
                  {currentOwner.name && currentOwner.name !== currentOwner.email
                    ? currentOwner.name
                    : currentOwner.email ?? '—'}
                </span>
              </div>
              {currentOwner.name_kana && (
                <p className="text-gray-500 pl-1">{currentOwner.name_kana}</p>
              )}
              {isConfirmed && currentOwner.charge_confirmed_at && (
                <p className="text-xs text-gray-400 pl-1">
                  確認日: {new Date(currentOwner.charge_confirmed_at).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
          ) : null}

          <div className={currentOwner ? 'border-t border-gray-100 pt-4' : ''}>
            <p className="text-xs font-medium text-gray-500 mb-2">
              {currentOwner ? '住民を変更（新しいメールアドレスへ再招待）' : '住民を招待'}
            </p>
            <UnitInviteForm action={inviteAction} />
          </div>

          {currentOwner && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <MoveOutButton action={moveOutResident.bind(null, id)} />
            </div>
          )}
        </section>
      )}

      {/* 振込情報 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">振込情報</h2>
        <div className="space-y-4 text-sm mb-4">
          <ProfileRow label="住民の振込情報" profile={userProfile ?? null} />
          <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
            <span className={`mt-0.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${adminProfile ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-gray-700">管理者による振込情報の修正</p>
                {canEdit && adminProfile && (
                  <ClearAdminProfileButton action={clearAdminPaymentProfile.bind(null, id)} />
                )}
              </div>
              {adminProfile ? (
                <p className="text-gray-500 mt-0.5">{adminProfile.transfer_name}・{adminProfile.bank_name}</p>
              ) : (
                <p className="text-gray-400 mt-0.5">未登録</p>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">管理者による振込情報の修正を入力</p>
            <PaymentProfileForm
              action={adminSetPaymentProfile.bind(null, id)}
              submitLabel="設定する"
            />
          </div>
        )}
        {canEdit && profileHistory && profileHistory.length > 0 && (
          <details className="border-t border-gray-100 pt-4 mt-4">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none">
              変更履歴（{profileHistory.length}件）
            </summary>
            <div className="mt-3 space-y-2">
              {profileHistory.map((p) => (
                <div key={p.id} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="shrink-0 rounded px-1.5 py-0.5 bg-gray-100 text-gray-500">
                    {p.source === 'user' ? '住民' : '管理者'}
                  </span>
                  <span className="flex-1">{p.transfer_name}・{p.bank_name}</span>
                  <span className="shrink-0 text-gray-400">
                    {p.effective_from} 〜 {p.effective_to}
                  </span>
                </div>
              ))}
            </div>
          </details>
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
  profile: { transfer_name: string; bank_name: string; effective_from: string } | null
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className={`mt-0.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${profile ? 'bg-green-500' : 'bg-gray-200'}`} />
      <div>
        <p className="font-medium text-gray-700">{label}</p>
        {profile ? (
          <p className="text-gray-500 mt-0.5">{profile.transfer_name}・{profile.bank_name}</p>
        ) : (
          <p className="text-gray-400 mt-0.5">未登録</p>
        )}
      </div>
    </div>
  )
}
