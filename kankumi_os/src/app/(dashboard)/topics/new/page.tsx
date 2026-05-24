import Link from 'next/link'
import { createTopic } from '@/app/actions/topics'
import { TopicForm } from '@/components/topics/topic-form'

export default function NewTopicPage() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/topics" className="text-sm text-gray-500 hover:text-gray-700">
          ← 議題・タスク
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">新規作成</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <TopicForm action={createTopic} submitLabel="作成" />
      </div>
    </div>
  )
}
