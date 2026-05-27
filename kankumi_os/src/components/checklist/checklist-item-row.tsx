'use client'

import { useState, useTransition, useActionState } from 'react'
import { updateChecklistStatus, updateChecklistItem, deleteChecklistItem } from '@/app/actions/checklist'

type ChecklistStatus = 'pending' | 'completed' | 'skipped'

interface ChecklistItem {
  id: string
  title: string
  status: string
  scheduled_date: string | null
  notes: string | null
}

const STATUS_STYLES: Record<ChecklistStatus, { label: string; className: string }> = {
  pending: { label: '未完了', className: 'bg-gray-100 text-gray-600' },
  completed: { label: '完了', className: 'bg-green-100 text-green-700' },
  skipped: { label: 'スキップ', className: 'bg-yellow-100 text-yellow-700' },
}

export function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const boundUpdateItem = updateChecklistItem.bind(null, item.id)
  const [editError, formAction, isFormPending] = useActionState(boundUpdateItem, null)

  const status = (item.status as ChecklistStatus) in STATUS_STYLES
    ? (item.status as ChecklistStatus)
    : 'pending'
  const st = STATUS_STYLES[status]

  function cycleStatus() {
    const next: Record<ChecklistStatus, ChecklistStatus> = {
      pending: 'completed',
      completed: 'skipped',
      skipped: 'pending',
    }
    startTransition(async () => {
      await updateChecklistStatus(item.id, next[status])
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteChecklistItem(item.id)
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 flex-1">{item.title}</p>
            <button
              onClick={cycleStatus}
              disabled={isPending}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer hover:opacity-80 disabled:opacity-50 ${st.className}`}
            >
              {isPending ? '...' : st.label}
            </button>
          </div>

          {!isEditing ? (
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              {item.scheduled_date && (
                <span>予定: {item.scheduled_date}</span>
              )}
              {item.notes && (
                <span className="truncate max-w-xs">{item.notes}</span>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800 transition-colors ml-auto"
              >
                編集
              </button>
            </div>
          ) : (
            <form
              action={async (fd) => {
                await formAction(fd)
                setIsEditing(false)
              }}
              className="mt-2 space-y-2"
            >
              {editError && (
                <p className="text-xs text-red-600">{editError}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 whitespace-nowrap">予定日</label>
                  <input
                    name="scheduled_date"
                    type="date"
                    defaultValue={item.scheduled_date ?? ''}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-gray-600 whitespace-nowrap">メモ</label>
                  <input
                    name="notes"
                    type="text"
                    defaultValue={item.notes ?? ''}
                    placeholder="備考"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isFormPending}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isFormPending ? '...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setConfirmDelete(false) }}
                  className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <div className="ml-auto flex items-center gap-2">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      削除
                    </button>
                  ) : (
                    <>
                      <span className="text-xs text-red-600">本当に削除しますか？</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {isDeleting ? '...' : 'はい'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        いいえ
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
