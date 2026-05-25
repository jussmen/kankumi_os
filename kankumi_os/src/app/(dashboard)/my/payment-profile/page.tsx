import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PaymentProfileForm } from '@/components/payment-profiles/payment-profile-form'
import { registerPaymentProfile } from '@/app/actions/payment-profiles'

export default async function MyPaymentProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  const { data: ownerRow } = await supabase
    .from('unit_owners')
    .select('unit_id')
    .eq('organization_id', membership.organization_id)
    .eq('user_id', user.id)
    .is('end_date', null)
    .single()

  const { data: profile } = ownerRow
    ? await supabase
        .from('payment_profiles')
        .select('transfer_name, bank_name, effective_from')
        .eq('unit_id', ownerRow.unit_id)
        .eq('organization_id', membership.organization_id)
        .eq('source', 'user')
        .is('effective_to', null)
        .single()
    : { data: null }

  return (
    <div className="px-4 py-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">振込情報の登録</h1>

      {!ownerRow ? (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
          部屋番号が登録されていません。管理者にお問い合わせください。
        </div>
      ) : (
        <>
          {profile && (
            <section className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-600 mb-3">現在登録中の振込情報</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">振込名義</dt>
                  <dd className="font-medium text-gray-900">{profile.transfer_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">銀行名</dt>
                  <dd className="font-medium text-gray-900">{profile.bank_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">登録日</dt>
                  <dd className="font-medium text-gray-900">{profile.effective_from}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              {profile ? '振込情報を更新' : '振込情報を登録'}
            </h2>
            <PaymentProfileForm
              action={registerPaymentProfile}
              submitLabel={profile ? '更新する' : '登録する'}
            />
          </section>
        </>
      )}
    </div>
  )
}
