'use client'

import { useActionState } from 'react'
import { inviteMember } from '@/app/actions/members'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

interface Unit {
  id: string
  unit_number: string
}

interface InviteFormProps {
  units: Unit[]
}

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: '管理者',
  vice_president: '副理事長',
  treasurer: '会計',
  board_member: '理事',
  auditor: '監事',
  resident: '住民',
}

export function InviteForm({ units }: InviteFormProps) {
  const [error, formAction, isPending] = useActionState(
    async (prevState: string | null, formData: FormData) => {
      const result = await inviteMember(prevState, formData)
      return result
    },
    null
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="example@email.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          ロール
        </label>
        <select
          id="role"
          name="role"
          defaultValue="resident"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.entries(ROLE_LABELS) as [MemberRole, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {units.length > 0 && (
        <div>
          <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700 mb-1">
            部屋番号（住民の場合）
          </label>
          <select
            id="unit_id"
            name="unit_id"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— 選択しない —</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_number}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '送信中...' : '招待メールを送信'}
      </button>
    </form>
  )
}
