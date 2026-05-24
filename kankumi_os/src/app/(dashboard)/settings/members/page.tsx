import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/members/invite-form'
import { RoleSelect } from '@/components/members/role-select'
import { RemoveMemberButton } from '@/components/members/remove-member-button'
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

  const { data: members } = await supabase
    .from('organization_members')
    .select('id, user_id, role, is_active, joined_at')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('joined_at')

  const { data: pendingMembers } = await supabase
    .from('organization_members')
    .select('id, user_id, role, is_active, joined_at')
    .eq('organization_id', orgId)
    .eq('is_active', false)
    .order('joined_at')

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .order('unit_number')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">メンバー管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">組合メンバーの招待・ロール管理を行います。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">
                アクティブメンバー ({(members ?? []).length}名)
              </h2>
            </div>
            {(members ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                メンバーがいません。
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(members ?? []).map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{member.user_id}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(member.joined_at).toLocaleDateString('ja-JP')}
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
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(pendingMembers ?? []).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">
                  招待中 ({(pendingMembers ?? []).length}名)
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {(pendingMembers ?? []).map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{member.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                        招待中
                      </span>
                      <span className="text-sm text-gray-500">{ROLE_LABELS[member.role]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 self-start">
          <h2 className="text-base font-semibold text-gray-800 mb-4">+ メンバーを招待</h2>
          <InviteForm units={units ?? []} />
        </div>
      </div>
    </div>
  )
}
