'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './user-menu'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

interface NavItem {
  label: string
  href: string
  roles: MemberRole[]
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        label: 'ダッシュボード',
        href: '/dashboard',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor'],
      },
    ],
  },
  {
    label: '日常業務',
    items: [
      {
        label: '住民台帳',
        href: '/units',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'resident'],
      },
      {
        label: '入金管理',
        href: '/payments',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor'],
      },
      {
        label: '議題・タスク',
        href: '/topics',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'resident'],
      },
      {
        label: 'お知らせ',
        href: '/announcements',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'resident'],
      },
      {
        label: '年間業務',
        href: '/checklist',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member'],
      },
    ],
  },
  {
    label: '会計管理',
    items: [
      {
        label: '収支管理',
        href: '/accounting',
        roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
      },
      {
        label: '会計レポート',
        href: '/accounting/report',
        roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
      },
    ],
  },
  {
    label: '設定',
    items: [
      {
        label: '組合設定',
        href: '/settings',
        roles: ['admin'],
      },
    ],
  },
]

interface SidebarProps {
  role: MemberRole
  orgName: string
  userEmail: string
  unitNumber?: string
}

export function Sidebar({ role, orgName, userEmail, unitNumber }: SidebarProps) {
  const pathname = usePathname()

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0)

  return (
    <aside className="w-64 h-full flex flex-col bg-white border-r border-gray-200 shrink-0">
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Kankumi OS
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-800 truncate">{orgName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            {group.label && (
              <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                const label =
                  role === 'resident' && item.href === '/units' && unitNumber
                    ? `${unitNumber}住民情報`
                    : item.label
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <UserMenu userEmail={userEmail} role={role} />
    </aside>
  )
}
