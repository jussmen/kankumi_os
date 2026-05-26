'use client'

import { useActionState, useState, useTransition } from 'react'
import { addComment, updateComment, deleteComment } from '@/app/actions/topics'

interface Comment {
  id: string
  body: string
  created_at: string
  updated_at: string
  author_id: string
  author_display: string
}

interface CommentThreadProps {
  topicId: string
  comments: Comment[]
  currentUserId: string
}

export function CommentThread({ topicId, comments, currentUserId }: CommentThreadProps) {
  const addCommentWithId = addComment.bind(null, topicId)
  const [error, formAction, isPending] = useActionState(addCommentWithId, null)

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-700">
        コメント {comments.length > 0 && `(${comments.length})`}
      </h3>

      {comments.length === 0 && (
        <p className="text-sm text-gray-400">まだコメントはありません。</p>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            topicId={topicId}
            isOwner={c.author_id === currentUserId}
          />
        ))}
      </div>

      <form action={formAction} className="space-y-2">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <textarea
          name="body"
          rows={3}
          placeholder="コメントを入力（Markdown対応）"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? '投稿中...' : '投稿'}
        </button>
      </form>
    </div>
  )
}

function CommentItem({
  comment,
  topicId,
  isOwner,
}: {
  comment: Comment
  topicId: string
  isOwner: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [editError, setEditError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!editBody.trim()) return
    startTransition(async () => {
      const result = await updateComment(comment.id, topicId, editBody.trim())
      if (result.error) {
        setEditError(result.error)
      } else {
        setIsEditing(false)
        setEditError(null)
      }
    })
  }

  function handleDelete() {
    if (!confirm('このコメントを削除しますか？')) return
    startTransition(async () => {
      await deleteComment(comment.id, topicId)
    })
  }

  const initials = comment.author_display.charAt(0).toUpperCase()
  const dateStr = new Date(comment.created_at).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-700">{comment.author_display}</span>
          <span className="text-xs text-gray-400">{dateStr}</span>
          {comment.updated_at !== comment.created_at && (
            <span className="text-xs text-gray-400">（編集済み）</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? '...' : '保存'}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditBody(comment.body) }}
                className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
        )}

        {isOwner && !isEditing && (
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
