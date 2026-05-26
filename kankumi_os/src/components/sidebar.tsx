'use client'

import { useState } from 'react'
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
    items: [
      {
        label: '住民台帳',
        href: '/units',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member'],
      },
      {
        label: '入金管理',
        href: '/payments',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member', 'auditor'],
      },
      {
        label: '議題・タスク',
        href: '/topics',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member'],
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
    items: [
      {
        label: 'マイプロフィール',
        href: '/my/profile',
        roles: ['resident'],
      },
    ],
  },
  {
    label: '引継・設定',
    items: [
      {
        label: '理事向け引継書',
        href: '/handover',
        roles: ['admin', 'vice_president', 'treasurer', 'board_member'],
      },
      {
        label: '組合設定',
        href: '/settings',
        roles: ['admin'],
      },
      {
        label: '業者管理',
        href: '/settings/vendors',
        roles: ['admin', 'vice_president'],
      },
    ],
  },
]

interface SidebarProps {
  role: MemberRole
  orgName: string
  userEmail: string
}

export function Sidebar({ role, orgName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0)

  const navContent = (onLinkClick?: () => void) => (
    <>
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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
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
            </div>
          </div>
        ))}
      </nav>
      <UserMenu userEmail={userEmail} role={role} />
    </>
  )

  return (
    <>
      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden md:flex w-64 h-full flex-col bg-white border-r border-gray-200 shrink-0">
        <div className="px-4 py-5 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Kankumi OS
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-800 truncate">{orgName}</p>
        </div>
        {navContent()}
      </aside>

      {/* モバイル: 上部バー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="メニューを開く"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="ml-3 text-sm font-semibold text-gray-800 truncate">{orgName}</p>
      </div>

      {/* モバイル: ドロワーオーバーレイ */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kankumi OS
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-800 truncate">{orgName}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="メニューを閉じる"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navContent(() => setMobileOpen(false))}
          </aside>
        </>
      )}
    </>
  )
}
