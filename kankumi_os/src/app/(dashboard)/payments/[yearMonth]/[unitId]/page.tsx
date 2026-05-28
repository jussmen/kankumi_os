import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { unmatch } from '@/app/actions/matching'
import type { Database } from '@/types/database'

type PaymentStatus = Database['public']['Enums']['payment_status']

const STATUS_BADGE: Record<PaymentStatus | 'missing', string> = {
  confirmed: 'bg-green-100 text-green-800',
  irregular: 'bg-yellow-100 text-yellow-800',
  missing: 'bg-gray-100 text-gray-500',
  excluded: 'bg-gray-50 text-gray-400',
}

const STATUS_LABEL: Record<PaymentStatus | 'missing', string> = {
  confirmed: '入金確認',
  irregular: '差異あり',
  missing: '未入金',
  excluded: '除外',
}

interface PageProps {
  params: Promise<{ yearMonth: string; unitId: string }>
}

export default async function UnitPaymentDetailPage({ params }: PageProps) {
  const { yearMonth, unitId } = await params

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) redirect('/payments')

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

  const { organization_id: orgId, role } = membership
  const canEdit = ['admin', 'vice_president', 'treasurer'].includes(role)

  const [
    { data: unit },
    { data: record },
    { data: chargeTypes },
    { data: unitCharges },
  ] = await Promise.all([
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('id', unitId)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('payment_records')
      .select('id, status, paid_amount, bank_transaction_id, has_irregularity_flag')
      .eq('unit_id', unitId)
      .eq('organization_id', orgId)
      .eq('year_month', yearMonth)
      .maybeSingle(),
    supabase
      .from('charge_types')
      .select('id, type, alias_name')
      .eq('organization_id', orgId)
      .eq('is_active', true),
    supabase
      .from('unit_charges')
      .select('charge_type_id, amount, effective_from, effective_to, is_not_applicable')
      .eq('unit_id', unitId)
      .eq('organization_id', orgId)
      .is('effective_to', null),
  ])

  if (!unit) notFound()

  const { data: transaction } = record?.bank_transaction_id
    ? await supabase
        .from('bank_transactions')
        .select('id, transaction_date, amount, description')
        .eq('id', record.bank_transaction_id)
        .single()
    : { data: null }

  const CHARGE_TYPE_LABELS: Record<string, string> = {
    management_fee: '管理費',
    reserve_fund: '修繕積立金',
    common_fee: '共益費',
    parking: '駐車場',
    bike_parking: '駐輪場',
    other: 'その他',
  }

  const activeCharges = (unitCharges ?? []).filter((c) => !c.is_not_applicable)
  const expectedTotal = activeCharges.reduce((sum, c) => sum + Number(c.amount), 0)
  const paidAmount = record ? Number(record.paid_amount) : 0
  const diff = paidAmount - expectedTotal

  const status = record?.status ?? 'missing'
  const displayMonth = yearMonth.replace('-', '/')

  return (
    <div className="px-6 py-8 max-w-2xl">
      {/* パンくず */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <Link href="/payments" className="hover:text-gray-700">入金確認</Link>
        <span>›</span>
        <Link href={`/payments/${yearMonth}`} className="hover:text-gray-700">{displayMonth} 入金状況</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {unit.unit_number} 入金状況
        <span className="ml-3 text-base font-normal text-gray-500">{displayMonth}</span>
      </h1>

      {/* ステータス */}
      <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          {record?.has_irregularity_flag && (
            <span className="text-sm text-yellow-600 font-medium">金額差異あり</span>
          )}
        </div>

        <dl className="divide-y divide-gray-100 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-gray-500">請求合計額</dt>
            <dd className="font-medium text-gray-900">
              {expectedTotal > 0 ? `${expectedTotal.toLocaleString()}円` : '—'}
            </dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-gray-500">入金額</dt>
            <dd className={`font-medium ${paidAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
              {paidAmount > 0 ? `${paidAmount.toLocaleString()}円` : '—'}
            </dd>
          </div>
          {paidAmount > 0 && expectedTotal > 0 && diff !== 0 && (
            <div className="flex justify-between py-2.5">
              <dt className="text-yellow-600">差異</dt>
              <dd className="font-medium text-yellow-600">
                {diff > 0 ? '+' : ''}{diff.toLocaleString()}円
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* 銀行明細 */}
      {transaction ? (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">照合済み銀行明細</h2>
          <dl className="divide-y divide-gray-100 text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-gray-500">入金日</dt>
              <dd className="text-gray-900">{transaction.transaction_date}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-gray-500">摘要</dt>
              <dd className="text-gray-900 text-right max-w-[60%] break-all">{transaction.description}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-gray-500">金額</dt>
              <dd className="font-medium text-gray-900">{Number(transaction.amount).toLocaleString()}円</dd>
            </div>
          </dl>
          {canEdit && record && (
            <form
              action={unmatch.bind(null, transaction.id, record.id, yearMonth)}
              className="mt-4 pt-4 border-t border-gray-100"
            >
              <button
                type="submit"
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                照合を解除する
              </button>
            </form>
          )}
        </section>
      ) : status !== 'missing' && status !== 'excluded' ? null : (
        <section className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-5 mb-4">
          <p className="text-sm text-gray-400 text-center">銀行明細が照合されていません</p>
        </section>
      )}

      {/* 費用項目内訳 */}
      {(chargeTypes ?? []).length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">費用項目内訳（{displayMonth}時点）</h2>
          <dl className="divide-y divide-gray-100 text-sm">
            {(chargeTypes ?? []).map((ct) => {
              const charge = (unitCharges ?? []).find((uc) => uc.charge_type_id === ct.id)
              const label = ct.alias_name ?? CHARGE_TYPE_LABELS[ct.type] ?? ct.type
              return (
                <div key={ct.id} className="flex justify-between py-2.5">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-900">
                    {!charge
                      ? <span className="text-gray-300">—</span>
                      : charge.is_not_applicable
                      ? <span className="text-xs text-gray-400">利用なし</span>
                      : `${Number(charge.amount).toLocaleString()}円`}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}

      {/* 住民台帳リンク */}
      <div className="text-xs text-gray-400">
        <Link href={`/units/${unit.id}`} className="hover:text-blue-600 hover:underline">
          {unit.unit_number} の住民台帳を見る →
        </Link>
      </div>
    </div>
  )
}
