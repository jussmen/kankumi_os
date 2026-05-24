import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/server'
import { updateTopic, updateTopicStatus, togglePin } from '@/app/actions/topics'
import { TopicForm } from '@/components/topics/topic-form'
import { CommentThread } from '@/components/topics/comment-thread'
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
  general: '一般',
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

  // コメント＋著者のメールアドレスを取得
  const { data: rawComments } = await supabase
    .from('comments')
    .select('id, body, created_at, updated_at, author_id')
    .eq('topic_id', id)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  // 著者のメールアドレスをuser_idで引く
  const authorIds = [...new Set((rawComments ?? []).map((c) => c.author_id))]
  const { data: members } = authorIds.length
    ? await supabase
        .from('organization_members')
        .select('user_id')
        .in('user_id', authorIds)
        .eq('organization_id', orgId)
    : { data: [] }

  // auth.usersは直接クエリ不可なので、member emailをprofile経由で取得できないため
  // 暫定：author_idをそのまま短縮表示、将来profiles実装後に差し替え
  const authorEmailMap = new Map(
    (members ?? []).map((m) => [m.user_id, `ユーザー(${m.user_id.slice(0, 6)})`])
  )
  // 自分だけemail表示
  authorEmailMap.set(user.id, user.email ?? user.id)

  const comments = (rawComments ?? []).map((c) => ({
    ...c,
    author_email: authorEmailMap.get(c.author_id) ?? c.author_id.slice(0, 8),
  }))

  const isEditing = edit === '1' && canEdit(role)
  const st = STATUS_STYLES[topic.status]
  const updateTopicWithId = updateTopic.bind(null, id)

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-4">
        <Link href="/topics" className="text-sm text-gray-500 hover:text-gray-700">
          ← 議題・タスク
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
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {(['open', 'in_progress', 'resolved', 'closed'] as TopicStatus[]).map((s) => (
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
