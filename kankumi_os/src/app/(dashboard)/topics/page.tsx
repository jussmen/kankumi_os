import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type TopicStatus = Database['public']['Enums']['topic_status']
type TopicType = Database['public']['Enums']['topic_type']
type Priority = Database['public']['Enums']['priority']
type Visibility = Database['public']['Enums']['visibility']

const TYPE_LABELS: Record<TopicType, string> = {
  board_meeting: '理事会',
  general: '一般',
  issue: '課題',
  notice: '告知',
  task: 'タスク',
}

const STATUS_STYLES: Record<TopicStatus, { label: string; className: string }> = {
  open: { label: '未着手', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '進行中', className: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: '解決済み', className: 'bg-green-100 text-green-700' },
  closed: { label: 'クローズ', className: 'bg-gray-100 text-gray-500' },
}

const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> = {
  urgent: { label: '緊急', className: 'text-red-600 font-semibold' },
  high: { label: '高', className: 'text-orange-500 font-medium' },
  normal: { label: '通常', className: 'text-gray-500' },
  low: { label: '低', className: 'text-gray-400' },
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  board_only: '理事のみ',
  all_members: '全住民',
}

interface PageProps {
  searchParams: Promise<{
    type?: string
    status?: string
    priority?: string
  }>
}

export default async function TopicsPage({ searchParams }: PageProps) {
  const filters = await searchParams

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
  const canCreate = ['admin', 'vice_president', 'treasurer', 'board_member'].includes(role)

  let query = supabase
    .from('topics')
    .select('id, title, type, status, priority, visibility, pinned_at, due_date, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type as TopicType)
  if (filters.status) query = query.eq('status', filters.status as TopicStatus)
  if (filters.priority) query = query.eq('priority', filters.priority as Priority)

  const { data: topics } = await query

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">議題・タスク</h1>
        {canCreate && (
          <Link
            href="/topics/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + 作成
          </Link>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FilterLink label="すべて" href="/topics" active={!filters.type && !filters.status && !filters.priority} />
        {(Object.entries(TYPE_LABELS) as [TopicType, string][]).map(([v, l]) => (
          <FilterLink key={v} label={l} href={`/topics?type=${v}`} active={filters.type === v} />
        ))}
        <span className="text-gray-300 self-center">|</span>
        {(['open', 'in_progress', 'resolved', 'closed'] as TopicStatus[]).map((s) => (
          <FilterLink key={s} label={STATUS_STYLES[s].label} href={`/topics?status=${s}`} active={filters.status === s} />
        ))}
      </div>

      {(topics ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">議題がまだありません。</p>
          {canCreate && (
            <Link href="/topics/new" className="text-sm text-blue-600 hover:underline">
              最初の議題を作成
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(topics ?? []).map((topic) => {
            const st = STATUS_STYLES[topic.status]
            const pr = PRIORITY_STYLES[topic.priority]
            const isPinned = !!topic.pinned_at

            return (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="block bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  {isPinned && (
                    <span className="shrink-0 mt-0.5 text-yellow-500 text-xs">📌</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-400">{TYPE_LABELS[topic.type]}</span>
                      <span className={`text-xs ${pr.className}`}>{pr.label}</span>
                      {topic.visibility === 'board_only' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {VISIBILITY_LABELS[topic.visibility]}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mt-0.5 truncate">{topic.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                      {topic.due_date && (
                        <span className="text-xs text-gray-400">期限: {topic.due_date}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(topic.updated_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </Link>
  )
}
