import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateTask, updateTaskStatus, deleteTask } from '@/app/actions/tasks'
import { TaskForm } from '@/components/tasks/task-form'

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  todo: { label: '未着手', className: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '進行中', className: 'bg-yellow-100 text-yellow-700' },
  done: { label: '完了', className: 'bg-green-100 text-green-700' },
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function TaskDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

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

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!task) notFound()

  let topicTitle: string | null = null
  if (task.topic_id) {
    const { data: topic } = await supabase
      .from('topics')
      .select('title')
      .eq('id', task.topic_id)
      .eq('organization_id', orgId)
      .single()
    topicTitle = topic?.title ?? null
  }

  const isEditing = edit === '1'
  const st = STATUS_STYLES[task.status] ?? STATUS_STYLES.todo
  const updateTaskWithId = updateTask.bind(null, id)
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.status !== 'done' && task.due_date && task.due_date < today

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-4">
        <Link href="/tasks" className="text-sm text-gray-500 hover:text-gray-700">
          ← アクションアイテム
        </Link>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">編集</h2>
          <TaskForm
            action={updateTaskWithId}
            defaultValues={{
              title: task.title,
              due_date: task.due_date,
              status: task.status,
              topic_id: task.topic_id,
            }}
            showStatus
            submitLabel="更新"
            cancelHref={`/tasks/${id}`}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                >
                  {st.label}
                </span>
                {task.due_date && (
                  <span
                    className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                  >
                    期限: {task.due_date}
                    {isOverdue && ' (期限切れ)'}
                  </span>
                )}
                {task.completed_at && (
                  <span className="text-xs text-gray-400">
                    完了: {new Date(task.completed_at).toLocaleDateString('ja-JP')}
                  </span>
                )}
              </div>
              {topicTitle && task.topic_id && (
                <div className="mt-2">
                  <Link
                    href={`/topics/${task.topic_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    議題: {topicTitle}
                  </Link>
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Link
                href={`/tasks/${id}?edit=1`}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                編集
              </Link>
              <form action={deleteTask.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
              </form>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            {['todo', 'in_progress', 'done'].map((s) => (
              <form key={s} action={updateTaskStatus.bind(null, id, s)}>
                <button
                  type="submit"
                  disabled={task.status === s}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    task.status === s
                      ? `${STATUS_STYLES[s].className} cursor-default`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {STATUS_STYLES[s].label}
                </button>
              </form>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            作成: {new Date(task.created_at).toLocaleDateString('ja-JP')}
          </div>
        </div>
      )}
    </div>
  )
}
