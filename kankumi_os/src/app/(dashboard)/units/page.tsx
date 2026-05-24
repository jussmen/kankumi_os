import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']

const PAGE_SIZE = 25

const OCCUPANCY_STYLES: Record<OccupancyStatus, { label: string; className: string }> = {
  occupied: { label: '居住中', className: 'bg-green-100 text-green-700' },
  vacant: { label: '空室', className: 'bg-yellow-100 text-yellow-700' },
  excluded: { label: '対象外', className: 'bg-gray-100 text-gray-500' },
}

interface PageProps {
  searchParams: Promise<{ page?: string; imported?: string }>
}

export default async function UnitsPage({ searchParams }: PageProps) {
  const { page: pageStr, imported } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

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

  // 総件数
  const { count } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  // Units（ページネーション）
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, floor, area_sqm, occupancy_status')
    .eq('organization_id', orgId)
    .order('unit_number')
    .range(offset, offset + PAGE_SIZE - 1)

  const unitIds = (units ?? []).map((u) => u.id)

  // DataReadiness: payment_profiles
  const { data: profiles } = unitIds.length
    ? await supabase
        .from('payment_profiles')
        .select('unit_id, source')
        .in('unit_id', unitIds)
        .is('effective_to', null)
    : { data: [] }

  // DataReadiness: unit_charges
  const { data: charges } = unitIds.length
    ? await supabase
        .from('unit_charges')
        .select('unit_id')
        .in('unit_id', unitIds)
        .is('effective_to', null)
    : { data: [] }

  const profilesByUnit = new Map<string, Set<string>>()
  for (const p of profiles ?? []) {
    if (!profilesByUnit.has(p.unit_id)) profilesByUnit.set(p.unit_id, new Set())
    profilesByUnit.get(p.unit_id)!.add(p.source)
  }
  const chargeUnitIds = new Set((charges ?? []).map((c) => c.unit_id))

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Unit台帳</h1>
          <p className="text-sm text-gray-500 mt-0.5">全{count ?? 0}戸</p>
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
          {imported}件のUnit台帳をインポートしました。
        </div>
      )}

      {(units ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">Unit台帳がまだ登録されていません。</p>
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
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">部屋番号</th>
                  <th className="px-4 py-3 text-left font-medium">階</th>
                  <th className="px-4 py-3 text-left font-medium">専有面積</th>
                  <th className="px-4 py-3 text-left font-medium">入居状態</th>
                  <th className="px-4 py-3 text-left font-medium" title="振込情報(住民) / 振込情報(管理) / 月額料金">
                    データ整備
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(units ?? []).map((unit) => {
                  const pSet = profilesByUnit.get(unit.id) ?? new Set()
                  const hasUser = pSet.has('user')
                  const hasAdmin = pSet.has('admin')
                  const hasCharge = chargeUnitIds.has(unit.id)
                  const occ = OCCUPANCY_STYLES[unit.occupancy_status]

                  return (
                    <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/units/${unit.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {unit.unit_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {unit.floor != null ? `${unit.floor}階` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {unit.area_sqm != null ? `${unit.area_sqm}㎡` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${occ.className}`}
                        >
                          {occ.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <DataDot active={hasUser} title="振込情報（住民）" />
                          <DataDot active={hasAdmin} title="振込情報（管理者）" />
                          <DataDot active={hasCharge} title="月額料金" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, count ?? 0)} / {count}件
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/units?page=${page - 1}`}
                    className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                  >
                    ← 前へ
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/units?page=${page + 1}`}
                    className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                  >
                    次へ →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DataDot({ active, title }: { active: boolean; title: string }) {
  return (
    <span
      title={title}
      className={`inline-block w-2.5 h-2.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-200'}`}
    />
  )
}
