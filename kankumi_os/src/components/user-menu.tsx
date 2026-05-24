'use client'

import { signOut } from '@/app/actions/auth'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: '管理者',
  vice_president: '副理事長',
  treasurer: '会計担当',
  board_member: '理事',
  auditor: '監事',
  resident: '住民',
}

interface UserMenuProps {
  userEmail: string
  role: MemberRole
}

export function UserMenu({ userEmail, role }: UserMenuProps) {
  return (
    <div className="px-4 py-4 border-t border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-blue-700">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          <p className="text-xs font-medium text-gray-700">{ROLE_LABELS[role]}</p>
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
        >
          ログアウト
        </button>
      </form>
    </div>
  )
}
