'use client'

import { useState, useTransition } from 'react'
import { updateMemberRole } from '@/app/actions/members'
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

interface Unit {
  id: string
  unit_number: string
}

interface RoleSelectProps {
  memberId: string
  currentRole: MemberRole
  availableUnits: Unit[]
  hasUnit: boolean  // すでに部屋が登録されているか
}

export function RoleSelect({ memberId, currentRole, availableUnits, hasUnit }: RoleSelectProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedRole, setSelectedRole] = useState<MemberRole>(currentRole)
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 住民に変更しようとしていて、かつ部屋がまだ未登録の場合のみ部屋選択を表示
  const needsUnitSelect = selectedRole === 'resident' && !hasUnit

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as MemberRole
    setError(null)
    setSelectedUnitId('')
    setSelectedRole(role)

    // 部屋選択が必要な場合は確定ボタン待ち
    if (role === 'resident' && !hasUnit) return

    // それ以外はすぐに実行（unit_owners には触れない）
    startTransition(async () => {
      const err = await updateMemberRole(memberId, role)
      if (err) {
        setError(err)
        setSelectedRole(currentRole)
      }
    })
  }

  function handleConfirm() {
    if (!selectedUnitId) {
      setError('部屋番号を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const err = await updateMemberRole(memberId, 'resident', selectedUnitId)
      if (err) {
        setError(err)
        setSelectedRole(currentRole)
      }
    })
  }

  function handleCancel() {
    setSelectedRole(currentRole)
    setSelectedUnitId('')
    setError(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={selectedRole}
        onChange={handleRoleChange}
        disabled={isPending}
        className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {(Object.entries(ROLE_LABELS) as [MemberRole, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {needsUnitSelect && (
        <>
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            disabled={isPending}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">部屋を選択</option>
            {availableUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_number}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !selectedUnitId}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            確定
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
        </>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
