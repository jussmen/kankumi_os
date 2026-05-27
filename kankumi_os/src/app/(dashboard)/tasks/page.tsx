import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  todo: { label: '未着手', className: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '進行中', className: 'bg-yellow-100 text-yellow-700' },
  done: { label: '完了', className: 'bg-green-100 text-green-700' },
}

interface PageProps {
  searchParams: Promise<{ status?: string; mine?: string }>
}

export default async function TasksPage({ searchParams }: PageProps) {
  const filters = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  const orgId = membership.organization_id

  let query = supabase
    .from('tasks')
    .select('id, title, status, due_date, assignee_id, topic_id, created_at, topics(id, title)')
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const statusFilter = filters.status && filters.status !== 'all' ? filters.status : null
  if (statusFilter) query = query.eq('status', statusFilter)
  if (filters.mine === '1') query = query.eq('assignee_id', user.id)

  const { data: tasks } = await query

  const today = new Date().toISOString().split('T')[0]

  const statusTabs = [
    { value: 'all', label: 'すべて' },
    { value: 'todo', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'done', label: '完了' },
  ]

  function tabHref(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('status', value)
    if (filters.mine === '1') params.set('mine', '1')
    const qs = params.toString()
    return `/tasks${qs ? `?${qs}` : ''}`
  }

  const activeTab = filters.status ?? 'all'

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">アクションアイテム</h1>
        <Link
          href="/tasks/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + 作成
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        <span className="text-gray-300 self-center">|</span>
        <Link
          href={filters.mine === '1' ? tabHref(activeTab).replace('mine=1&', '').replace('&mine=1', '').replace('mine=1', '') : `${tabHref(activeTab)}${tabHref(activeTab).includes('?') ? '&' : '?'}mine=1`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filters.mine === '1'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          自分のタスク
        </Link>
      </div>

      {(tasks ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">タスクがまだありません。</p>
          <Link href="/tasks/new" className="text-sm text-blue-600 hover:underline">
            最初のタスクを作成
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(tasks ?? []).map((task) => {
            const st = STATUS_STYLES[task.status] ?? STATUS_STYLES.todo
            const isOverdue =
              task.status !== 'done' && task.due_date && task.due_date < today
            const parentTopic = Array.isArray(task.topics) ? task.topics[0] : task.topics

            return (
              <div
                key={task.id}
                className={`rounded-lg border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all ${
                  isOverdue ? 'bg-red-50' : 'bg-white'
                }`}
              >
                {parentTopic && (
                  <Link
                    href={`/topics/${parentTopic.id}`}
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 mb-1.5"
                  >
                    ← {parentTopic.title}
                  </Link>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block font-medium text-gray-900 hover:text-blue-700 truncate"
                    >
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                      {task.due_date && (
                        <span
                          className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}
                        >
                          期限: {task.due_date}
                          {isOverdue && ' (期限切れ)'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
