import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

function getRenewalUrgency(renewalDate: string | null): 'urgent' | 'warning' | null {
  if (!renewalDate) return null
  const days = Math.floor((new Date(renewalDate).getTime() - Date.now()) / 86400000)
  if (days <= 30) return 'urgent'
  if (days <= 90) return 'warning'
  return null
}

export default async function VendorsPage() {
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

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, category, custom_category, contact_name, is_active')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  const { data: contracts } = await supabase
    .from('vendor_contracts')
    .select('id, vendor_id, renewal_date')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  // Group contracts by vendor
  const contractsByVendor = new Map<string, { count: number; nearestRenewal: string | null }>()
  for (const contract of contracts ?? []) {
    const existing = contractsByVendor.get(contract.vendor_id)
    const currentNearest = existing?.nearestRenewal ?? null
    const newRenewal = contract.renewal_date

    let nearestRenewal = currentNearest
    if (newRenewal) {
      if (!nearestRenewal || new Date(newRenewal) < new Date(nearestRenewal)) {
        nearestRenewal = newRenewal
      }
    }

    contractsByVendor.set(contract.vendor_id, {
      count: (existing?.count ?? 0) + 1,
      nearestRenewal,
    })
  }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">業者管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">契約中の業者と契約内容を管理します。</p>
        </div>
        <Link
          href="/settings/vendors/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 業者を追加
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!vendors || vendors.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            業者が登録されていません。「+ 業者を追加」から登録してください。
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  業者名
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  担当者
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  契約数
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  更新期限
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((vendor) => {
                const info = contractsByVendor.get(vendor.id)
                const urgency = getRenewalUrgency(info?.nearestRenewal ?? null)
                const categoryLabel =
                  vendor.category === 'other' && vendor.custom_category
                    ? vendor.custom_category
                    : CATEGORY_LABELS[vendor.category as VendorCategory]

                return (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600">{categoryLabel}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/settings/vendors/${vendor.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {vendor.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {vendor.contact_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {info?.count ?? 0}件
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {info?.nearestRenewal ? (
                        <span className="flex items-center gap-2">
                          {new Date(info.nearestRenewal).toLocaleDateString('ja-JP')}
                          {urgency === 'urgent' && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                              期限間近
                            </span>
                          )}
                          {urgency === 'warning' && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                              要確認
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
