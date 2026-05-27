import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/server'
import { updateTopic, updateTopicStatus, togglePin } from '@/app/actions/topics'
import { updateTaskStatus } from '@/app/actions/tasks'
import { TopicForm } from '@/components/topics/topic-form'
import { CommentThread } from '@/components/topics/comment-thread'
import { ResolveTopicForm } from '@/components/topics/resolve-topic-form'
import type { Database } from '@/types/database'

type TopicStatus = Database['public']['Enums']['topic_status']
type MemberRole = Database['public']['Enums']['member_role']

const STATUS_STYLES: Record<TopicStatus, { label: string; className: string }> = {
  open: { label: '未着手', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '進行中', className: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: '解決済み', className: 'bg-green-100 text-green-700' },
  closed: { label: 'クローズ', className: 'bg-gray-100 text-gray-500' },
}

const TYPE_LABELS: Record<string, string> = {
  board_meeting: '理事会',
  general: '公開トピック',
  issue: '課題',
  notice: '告知',
  task: 'タスク',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '緊急',
  high: '高',
  normal: '通常',
  low: '低',
}

function canEdit(role: MemberRole) {
  return ['admin', 'vice_president', 'treasurer', 'board_member'].includes(role)
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function TopicDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

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

  const { data: topic } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!topic) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date')
    .eq('topic_id', id)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  const { data: rawComments } = await supabase
    .from('comments')
    .select('id, body, created_at, updated_at, author_id')
    .eq('topic_id', id)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  const authorIds = [...new Set((rawComments ?? []).map((c) => c.author_id))]
  const { data: ownerProfiles } = authorIds.length
    ? await supabase
        .from('unit_owners')
        .select('user_id, name, units(unit_number)')
        .in('user_id', authorIds)
        .is('end_date', null)
    : { data: [] as { user_id: string; name: string; units: { unit_number: string } | null }[] }

  const authorDisplayMap = new Map<string, string>()
  for (const op of ownerProfiles ?? []) {
    if (!op.user_id) continue
    const unit = Array.isArray(op.units) ? op.units[0] : op.units
    authorDisplayMap.set(
      op.user_id,
      unit?.unit_number ? `${op.name}（${unit.unit_number}）` : op.name
    )
  }
  if (!authorDisplayMap.has(user.id)) {
    authorDisplayMap.set(user.id, user.email ?? user.id)
  }

  const comments = (rawComments ?? []).map((c) => ({
    ...c,
    author_display: authorDisplayMap.get(c.author_id) ?? `ユーザー(${c.author_id.slice(0, 6)})`,
  }))

  const isEditing = edit === '1' && canEdit(role)
  const st = STATUS_STYLES[topic.status]
  const updateTopicWithId = updateTopic.bind(null, id)

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-4">
        <Link href="/topics" className="text-sm text-gray-500 hover:text-gray-700">
          ← トピックリスト
        </Link>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">編集</h2>
          <TopicForm
            action={updateTopicWithId}
            defaultValues={topic}
            showStatus
            submitLabel="更新"
            cancelHref={`/topics/${id}`}
          />
        </div>
      ) : (
        <>
          {/* ヘッダー */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400">{TYPE_LABELS[topic.type]}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{PRIORITY_LABELS[topic.priority]}</span>
                  {topic.visibility === 'board_only' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      理事のみ
                    </span>
                  )}
                  {topic.pinned_at && (
                    <span className="text-xs text-yellow-600">📌 ピン留め</span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900">{topic.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                  >
                    {st.label}
                  </span>
                  {topic.due_date && (
                    <span className="text-xs text-gray-500">期限: {topic.due_date}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    更新: {new Date(topic.updated_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>

              {canEdit(role) && (
                <div className="flex gap-2 shrink-0">
                  <form action={togglePin.bind(null, id, !topic.pinned_at)}>
                    <button
                      type="submit"
                      className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {topic.pinned_at ? 'ピン解除' : 'ピン留め'}
                    </button>
                  </form>
                  <Link
                    href={`/topics/${id}?edit=1`}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    編集
                  </Link>
                </div>
              )}
            </div>

            {/* ステータス変更 */}
            {canEdit(role) && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 items-start">
                {(['open', 'in_progress'] as TopicStatus[]).map((s) => (
                  <form key={s} action={updateTopicStatus.bind(null, id, s)}>
                    <button
                      type="submit"
                      disabled={topic.status === s}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        topic.status === s
                          ? `${STATUS_STYLES[s].className} cursor-default`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {STATUS_STYLES[s].label}
                    </button>
                  </form>
                ))}
                <ResolveTopicForm
                  topicId={id}
                  currentStatus={topic.status}
                  targetStatus="resolved"
                  label={STATUS_STYLES.resolved.label}
                />
                <ResolveTopicForm
                  topicId={id}
                  currentStatus={topic.status}
                  targetStatus="closed"
                  label={STATUS_STYLES.closed.label}
                />
              </div>
            )}

            {/* 決定内容 */}
            {topic.resolution && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">決定内容</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{topic.resolution}</p>
              </div>
            )}
          </div>

          {/* 本文 */}
          {topic.body && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{topic.body}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* タスク */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">アクションアイテム</h2>
              <Link
                href={`/tasks/new?topic_id=${id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                + タスク追加
              </Link>
            </div>
            {(tasks ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">タスクはまだありません。</p>
            ) : (
              <ul className="space-y-1">
                {(tasks ?? []).map((task) => {
                  const today = new Date().toISOString().split('T')[0]
                  const isOverdue = task.status !== 'done' && task.due_date && task.due_date < today
                  const statusBadge =
                    task.status === 'done'
                      ? 'bg-green-100 text-green-700'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  const statusLabel =
                    task.status === 'done' ? '完了' : task.status === 'in_progress' ? '進行中' : '未着手'

                  return (
                    <li
                      key={task.id}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusBadge}`}
                      >
                        {statusLabel}
                      </span>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="flex-1 text-sm text-gray-800 hover:text-blue-600 truncate"
                      >
                        {task.title}
                      </Link>
                      {task.due_date && (
                        <span
                          className={`text-xs shrink-0 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}
                        >
                          {task.due_date}
                        </span>
                      )}
                      {task.status !== 'done' && (
                        <form action={updateTaskStatus.bind(null, task.id, 'done')}>
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-green-600 transition-colors shrink-0"
                          >
                            完了
                          </button>
                        </form>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* コメント */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <CommentThread
              topicId={id}
              comments={comments}
              currentUserId={user.id}
            />
          </div>
        </>
      )}
    </div>
  )
}
