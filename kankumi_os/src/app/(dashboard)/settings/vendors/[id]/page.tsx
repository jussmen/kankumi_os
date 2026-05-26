import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createVendorContract } from '@/app/actions/vendors'
import { DeleteVendorButton } from '@/components/vendors/delete-vendor-button'
import { DeleteVendorContractButton } from '@/components/vendors/delete-vendor-contract-button'
import { AddContractSection } from '@/components/vendors/add-contract-section'
import type { Database } from '@/types/database'

type VendorCategory = Database['public']['Enums']['vendor_category']

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  cleaning: '清掃',
  equipment_maintenance: '設備保守',
  legal_inspection: '法定点検',
  insurance: '保険',
  landscaping: '植栽・外構',
  renovation: '修繕工事',
  security: '警備',
  other: 'その他',
}

const COST_CYCLE_LABELS: Record<string, string> = {
  monthly: '円/月',
  yearly: '円/年',
  one_time: '円（一括）',
}

function getRenewalUrgency(renewalDate: string | null): 'urgent' | 'warning' | null {
  if (!renewalDate) return null
  const days = Math.floor((new Date(renewalDate).getTime() - Date.now()) / 86400000)
  if (days <= 30) return 'urgent'
  if (days <= 90) return 'warning'
  return null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VendorDetailPage({ params }: PageProps) {
  const { id } = await params

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

  const canManage = membership.role === 'admin' || membership.role === 'vice_president'
  if (!canManage) redirect('/settings')

  const orgId = membership.organization_id

  const [{ data: vendor }, { data: contracts }] = await Promise.all([
    supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('vendor_contracts')
      .select('*')
      .eq('vendor_id', id)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at'),
  ])

  if (!vendor) notFound()

  const categoryLabel =
    vendor.category === 'other' && vendor.custom_category
      ? vendor.custom_category
      : CATEGORY_LABELS[vendor.category as VendorCategory]

  const addContractAction = createVendorContract.bind(null, id)

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <Link href="/settings/vendors" className="text-sm text-gray-500 hover:text-gray-700">
          ← 業者管理
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{vendor.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{categoryLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/settings/vendors/${id}/edit`}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              編集
            </Link>
            <DeleteVendorButton vendorId={id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 業者情報 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">業者情報</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">カテゴリ</dt>
                <dd className="mt-0.5 text-sm text-gray-800">{categoryLabel}</dd>
              </div>
              {vendor.contact_name && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">担当者</dt>
                  <dd className="mt-0.5 text-sm text-gray-800">{vendor.contact_name}</dd>
                </div>
              )}
              {vendor.contact_phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">電話番号</dt>
                  <dd className="mt-0.5 text-sm text-gray-800">{vendor.contact_phone}</dd>
                </div>
              )}
              {vendor.contact_email && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">メール</dt>
                  <dd className="mt-0.5 text-sm text-gray-800 break-all">{vendor.contact_email}</dd>
                </div>
              )}
              {vendor.notes && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">メモ</dt>
                  <dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* 契約一覧 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                契約一覧（{contracts?.length ?? 0}件）
              </h2>
            </div>

            {!contracts || contracts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                契約が登録されていません。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contracts.map((contract) => {
                  const urgency = getRenewalUrgency(contract.renewal_date)
                  const costSuffix = contract.cost_cycle
                    ? COST_CYCLE_LABELS[contract.cost_cycle] ?? ''
                    : ''

                  return (
                    <div key={contract.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {contract.service_description}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                            {(contract.start_date || contract.end_date) && (
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500">期間: </span>
                                <span className="text-xs text-gray-700">
                                  {contract.start_date
                                    ? new Date(contract.start_date).toLocaleDateString('ja-JP')
                                    : '—'}{' '}
                                  〜{' '}
                                  {contract.end_date
                                    ? new Date(contract.end_date).toLocaleDateString('ja-JP')
                                    : '—'}
                                </span>
                              </div>
                            )}
                            {contract.cost_amount != null && (
                              <div>
                                <span className="text-xs text-gray-500">費用: </span>
                                <span className="text-xs text-gray-700">
                                  {contract.cost_amount.toLocaleString()}
                                  {costSuffix}
                                </span>
                              </div>
                            )}
                            {contract.renewal_date && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">更新日: </span>
                                <span className="text-xs text-gray-700">
                                  {new Date(contract.renewal_date).toLocaleDateString('ja-JP')}
                                </span>
                                {urgency === 'urgent' && (
                                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                                    期限間近
                                  </span>
                                )}
                                {urgency === 'warning' && (
                                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                                    要確認
                                  </span>
                                )}
                              </div>
                            )}
                            <div>
                              <span className="text-xs text-gray-500">自動更新: </span>
                              <span className="text-xs text-gray-700">
                                {contract.auto_renewal ? 'あり' : 'なし'}
                              </span>
                            </div>
                          </div>
                          {contract.notes && (
                            <p className="mt-2 text-xs text-gray-500 whitespace-pre-wrap">
                              {contract.notes}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <DeleteVendorContractButton contractId={contract.id} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 契約追加 */}
          <AddContractSection action={addContractAction} />
        </div>
      </div>
    </div>
  )
}
