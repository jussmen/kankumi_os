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

  const hasChanged = selectedRole !== currentRole
  const needsUnitSelect = selectedRole === 'resident' && !hasUnit

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setError(null)
    setSelectedUnitId('')
    setSelectedRole(e.target.value as MemberRole)
  }

  function handleConfirm() {
    if (needsUnitSelect && !selectedUnitId) {
      setError('部屋番号を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const err = await updateMemberRole(
        memberId,
        selectedRole,
        needsUnitSelect ? selectedUnitId : undefined
      )
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

      {hasChanged && needsUnitSelect && (
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
      )}

      {hasChanged && (
        <>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || (needsUnitSelect && !selectedUnitId)}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            変更
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
