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

const NAV_ITEMS: NavItem[] = [
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor', 'resident'],
  },
  {
    label: '住民・Unit台帳',
    href: '/units',
    roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'resident'],
  },
  {
    label: '入金管理',
    href: '/payments',
    roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor'],
  },
  {
    label: '収支管理',
    href: '/accounting',
    roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
  },
  {
    label: '年間照合',
    href: '/accounting/annual',
    roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
  },
  {
    label: '予算管理',
    href: '/accounting/budget',
    roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
  },
  {
    label: '収支報告書',
    href: '/accounting/report',
    roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
  },
  {
    label: '監査サマリー',
    href: '/accounting/audit',
    roles: ['admin', 'vice_president', 'treasurer', 'auditor'],
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
  {
    label: '組合設定',
    href: '/settings',
    roles: ['admin'],
  },
]

interface SidebarProps {
  role: MemberRole
  orgName: string
  userEmail: string
}

export function Sidebar({ role, orgName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-64 h-full flex flex-col bg-white border-r border-gray-200 shrink-0">
      <div className="px-4 py-5 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Kankumi OS
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-800 truncate">{orgName}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
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
              {item.label}
            </Link>
          )
        })}
      </nav>

      <UserMenu userEmail={userEmail} role={role} />
    </aside>
  )
}
