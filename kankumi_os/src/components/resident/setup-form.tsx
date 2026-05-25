'use client'

import { useActionState } from 'react'

interface ResidentSetupFormProps {
  action: (prevState: string | null, formData: FormData) => Promise<string | null>
  defaultName?: string
  defaultNameKana?: string
  defaultTransferName?: string
  defaultBankName?: string
}

export function ResidentSetupForm({
  action,
  defaultName = '',
  defaultNameKana = '',
  defaultTransferName = '',
  defaultBankName = '',
}: ResidentSetupFormProps) {
  const [error, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-600 mb-3">基本情報</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
              氏名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={defaultName}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 山田 太郎"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name_kana">
              氏名（カナ）
            </label>
            <input
              id="name_kana"
              name="name_kana"
              type="text"
              required
              defaultValue={defaultNameKana}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: ヤマダ タロウ"
            />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-600 mb-3">振込情報</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="transfer_name">
              振込名義（カナ）
            </label>
            <input
              id="transfer_name"
              name="transfer_name"
              type="text"
              required
              defaultValue={defaultTransferName}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: ヤマダ タロウ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bank_name">
              銀行名
            </label>
            <input
              id="bank_name"
              name="bank_name"
              type="text"
              required
              defaultValue={defaultBankName}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: ○○銀行"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '処理中...' : '確認しました、登録します'}
      </button>
    </form>
  )
}
