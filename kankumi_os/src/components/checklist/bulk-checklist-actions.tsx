'use client'

import { useState, useTransition } from 'react'

interface Props {
  fiscalYearId: string
  onBulkDelete: (fiscalYearId: string) => Promise<void>
  onSaveAsTemplate: (fiscalYearId: string) => Promise<{ created: number }>
}

export function BulkChecklistActions({ fiscalYearId, onBulkDelete, onSaveAsTemplate }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveResult, setSaveResult] = useState<number | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()

  function handleDelete() {
    startDeleteTransition(async () => {
      await onBulkDelete(fiscalYearId)
    })
  }

  function handleSaveAsTemplate() {
    setSaveResult(null)
    startSaveTransition(async () => {
      const { created } = await onSaveAsTemplate(fiscalYearId)
      setSaveResult(created)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 mb-4">
      {/* テンプレートに保存 */}
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveAsTemplate}
          disabled={isSaving}
          className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
        >
          {isSaving ? '保存中...' : 'この内容をテンプレートに保存'}
        </button>
        {saveResult !== null && (
          <span className={saveResult > 0 ? 'text-green-600' : 'text-gray-400'}>
            {saveResult > 0 ? `${saveResult}件追加しました` : '新規テンプレートなし'}
          </span>
        )}
      </span>

      <span className="text-gray-300 select-none">|</span>

      {/* 一括削除 */}
      {!confirmDelete ? (
        <button
          type="button"
          onClick={() => { setConfirmDelete(true); setSaveResult(null) }}
          className="text-red-500 hover:text-red-700 transition-colors"
        >
          一括削除
        </button>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-red-600">全件削除しますか？</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isDeleting ? '...' : 'はい'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            いいえ
          </button>
        </span>
      )}
    </div>
  )
}
