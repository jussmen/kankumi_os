import Link from 'next/link'
import { createTask } from '@/app/actions/tasks'
import { TaskForm } from '@/components/tasks/task-form'

interface PageProps {
  searchParams: Promise<{ topic_id?: string }>
}

export default async function NewTaskPage({ searchParams }: PageProps) {
  const { topic_id } = await searchParams

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-4">
        <Link href="/tasks" className="text-sm text-gray-500 hover:text-gray-700">
          ← アクションアイテム
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">タスク作成</h1>
        <TaskForm
          action={createTask}
          defaultValues={{ topic_id: topic_id ?? null }}
          submitLabel="作成"
          cancelHref={topic_id ? `/topics/${topic_id}` : '/tasks'}
        />
      </div>
    </div>
  )
}
