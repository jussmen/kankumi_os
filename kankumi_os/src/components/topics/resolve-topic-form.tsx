'use client'

import { useState, useTransition } from 'react'
import { resolveTopicWithNote } from '@/app/actions/topics'

const ACTIVE_CLASS: Record<'resolved' | 'closed', string> = {
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

interface ResolveTopicFormProps {
  topicId: string
  currentStatus: string
  targetStatus: 'resolved' | 'closed'
  label: string
}

export function ResolveTopicForm({
  topicId,
  currentStatus,
  targetStatus,
  label,
}: ResolveTopicFormProps) {
  const [open, setOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [isPending, startTransition] = useTransition()

  const isCurrentStatus = currentStatus === targetStatus

  if (isCurrentStatus) {
    return (
      <button
        type="button"
        disabled
        className={`rounded-full px-3 py-1 text-xs font-medium cursor-default ${ACTIVE_CLASS[targetStatus]}`}
      >
        {label}
      </button>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      >
        {label}
      </button>
    )
  }

  function handleSubmit() {
    startTransition(async () => {
      await resolveTopicWithNote(topicId, resolution, targetStatus)
      setOpen(false)
      setResolution('')
    })
  }

  return (
    <div className="w-full mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-medium text-gray-600">{label} — 決定内容・理由（任意）</p>
      <textarea
        rows={3}
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="決定内容や理由を記入してください（省略可）"
        disabled={isPending}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y disabled:opacity-50"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '処理中...' : '確定'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setResolution('')
          }}
          disabled={isPending}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
