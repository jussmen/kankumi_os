import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from '@/components/members/invite-form'
import { RoleSelect } from '@/components/members/role-select'
import { RemoveMemberButton } from '@/components/members/remove-member-button'
import { ResendInviteButton } from '@/components/members/resend-invite-button'
import { CancelInviteButton } from '@/components/members/cancel-invite-button'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: '管理者',
  vice_president: '副理事長',
  treasurer: '会計',
  board_member: '理事',
  auditor: '監事',
  resident: '住民',
}

const STAFF_ROLES: MemberRole[] = ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor']

export default async function MembersPage() {
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

  const { orgId, role: myRole } = { orgId: membership.organization_id, role: membership.role }

  if (myRole !== 'admin') redirect('/settings')

  const adminClient = createAdminClient()

  const [
    { data: members },
    { data: pendingMembers },
    { data: units },
    { data: { users: authUsers } },
    { data: unitOwners },
  ] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, user_id, role, is_active, joined_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('joined_at'),
    supabase
      .from('organization_members')
      .select('id, user_id, role, is_active, joined_at')
      .eq('organization_id', orgId)
      .eq('is_active', false)
      .order('joined_at'),
    supabase
      .from('units')
      .select('id, unit_number')
      .eq('organization_id', orgId)
      .order('unit_number'),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    adminClient
      .from('unit_owners')
      .select('unit_id, user_id, email')
      .eq('organization_id', orgId)
      .is('end_date', null),
  ])

  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? u.id]))

  // Supabase から直接削除されたユーザーを識別するためのセット
  const validUserIds = new Set(authUsers.map((u) => u.id))
  const validEmails = new Set(authUsers.map((u) => u.email).filter((e): e is string => !!e))

  // unit_owners から占有状況を構築（孤立レコードは除外）
  const unitNumberMap = new Map((units ?? []).map((u) => [u.id, u.unit_number]))
  const occupiedUnitIds = new Set<string>()
  const emailToUnitId = new Map<string, string>()
  const userIdToUnitId = new Map<string, string>()

  for (const uo of (unitOwners ?? [])) {
    // auth に存在しないユーザーの unit_owners はスキップ（孤立レコード）
    const ownerExists = uo.user_id
      ? validUserIds.has(uo.user_id)
      : uo.email ? validEmails.has(uo.email) : false
    if (!ownerExists) continue

    occupiedUnitIds.add(uo.unit_id)
    if (uo.user_id) {
      userIdToUnitId.set(uo.user_id, uo.unit_id)
    } else if (uo.email) {
      emailToUnitId.set(uo.email, uo.unit_id)
    }
  }

  // 新規招待フォームに渡す空き部屋
  const availableUnits = (units ?? []).filter((u) => !occupiedUnitIds.has(u.id))

  // 招待中メンバーの部屋番号を引く
  function getPendingUnitNumber(userId: string): string | undefined {
    const email = emailMap.get(userId)
    const unitId = email ? emailToUnitId.get(email) : undefined
    return unitId ? unitNumberMap.get(unitId) : undefined
  }

  const staffMembers = (members ?? []).filter((m) => STAFF_ROLES.includes(m.role as MemberRole))
  const residentMembers = (members ?? []).filter((m) => m.role === 'resident')
  // auth に存在しないユーザーの招待中エントリを除外
  const activePendingMembers = (pendingMembers ?? []).filter((m) => validUserIds.has(m.user_id))

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">メンバー管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">組合メンバーの招待・ロール管理を行います。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* 役員・担当者 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                役員・担当者 ({staffMembers.length}名)
              </h2>
            </div>
            {staffMembers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                役員・担当者がいません。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {staffMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">
                        {emailMap.get(member.user_id) ?? member.user_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {member.user_id !== user.id ? (
                        <>
                          <RoleSelect memberId={member.id} currentRole={member.role} />
                          <RemoveMemberButton memberId={member.id} />
                        </>
                      ) : (
                        <span className="rounded border border-gray-200 px-2 py-1 text-sm text-gray-600">
                          {ROLE_LABELS[member.role as MemberRole]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 住民 */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                住民 ({residentMembers.length}名)
              </h2>
            </div>
            {residentMembers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                住民が登録されていません。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {residentMembers.map((member) => {
                  const unitId = userIdToUnitId.get(member.user_id)
                  const unitNumber = unitId ? unitNumberMap.get(unitId) : undefined
                  return (
                    <div key={member.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          {emailMap.get(member.user_id) ?? member.user_id}
                        </p>
                        {unitNumber && (
                          <p className="text-xs text-gray-500">{unitNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RoleSelect memberId={member.id} currentRole={member.role} />
                        <RemoveMemberButton memberId={member.id} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 招待中 */}
          {activePendingMembers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">
                  招待中 ({activePendingMembers.length}名)
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {activePendingMembers.map((member) => {
                  const unitNumber = member.role === 'resident'
                    ? getPendingUnitNumber(member.user_id)
                    : undefined
                  return (
                    <div key={member.id} className="flex items-center justify-between px-5 py-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {emailMap.get(member.user_id) ?? member.user_id}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                            招待中
                          </span>
                          <span className="text-xs text-gray-500">{ROLE_LABELS[member.role as MemberRole]}</span>
                          {unitNumber && (
                            <span className="text-xs text-gray-500">{unitNumber}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ResendInviteButton memberId={member.id} />
                        <CancelInviteButton memberId={member.id} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 self-start">
          <h2 className="text-base font-semibold text-gray-800 mb-4">+ メンバーを招待</h2>
          <InviteForm units={availableUnits} />
        </div>
      </div>
    </div>
  )
}
