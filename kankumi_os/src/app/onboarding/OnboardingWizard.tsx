'use client'

import { useState, useActionState } from 'react'
import { createOrganization } from '@/app/actions/onboarding'

type Step = 1 | 2 | 3 | 4

interface WizardData {
  // Step 1
  name: string
  address: string
  unit_count: string
  fiscal_year_start: string
  // Step 2
  charge_type_common_fee: boolean
  charge_type_parking: boolean
  charge_type_bike_parking: boolean
  charge_type_other: boolean
  charge_type_other_alias: string
  // Step 3
  bank_preset: string
}

const STEPS = [
  '組合基本情報',
  '費用項目の設定',
  '銀行口座の設定',
  '完了',
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1)
  const [stepError, setStepError] = useState<string | null>(null)
  const [data, setData] = useState<WizardData>({
    name: '',
    address: '',
    unit_count: '',
    fiscal_year_start: '4',
    charge_type_common_fee: false,
    charge_type_parking: false,
    charge_type_bike_parking: false,
    charge_type_other: false,
    charge_type_other_alias: '',
    bank_preset: '',
  })

  const [submitError, submitAction, isSubmitting] = useActionState(
    createOrganization,
    null
  )

  function buildFormData(): FormData {
    const fd = new FormData()
    fd.set('name', data.name)
    fd.set('address', data.address)
    fd.set('unit_count', data.unit_count)
    fd.set('fiscal_year_start', data.fiscal_year_start)
    if (data.charge_type_common_fee) fd.set('charge_type_common_fee', 'on')
    if (data.charge_type_parking) fd.set('charge_type_parking', 'on')
    if (data.charge_type_bike_parking) fd.set('charge_type_bike_parking', 'on')
    if (data.charge_type_other) fd.set('charge_type_other', 'on')
    fd.set('charge_type_other_alias', data.charge_type_other_alias)
    fd.set('bank_preset', data.bank_preset)
    return fd
  }

  function validateStep1(): string | null {
    if (!data.name.trim()) return 'マンション名を入力してください。'
    const n = parseInt(data.unit_count, 10)
    if (isNaN(n) || n < 1) return '戸数は1以上の数値を入力してください。'
    return null
  }

  function handleNext() {
    if (step === 1) {
      const err = validateStep1()
      if (err) {
        setStepError(err)
        return
      }
    }
    setStepError(null)
    setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev))
  }

  function handleBack() {
    setStepError(null)
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))
  }

  return (
    <div>
      {/* ステップインジケーター */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, idx) => {
          const stepNum = (idx + 1) as Step
          const isActive = stepNum === step
          const isDone = stepNum < step
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isDone
                      ? 'bg-blue-600 text-white'
                      : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className={`mt-1 text-xs text-center leading-tight ${
                    isActive ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-12px] ${
                    stepNum < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: 組合基本情報 */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">組合基本情報</h2>
          <p className="text-sm text-gray-500 mb-6">マンションの基本情報を入力してください。</p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                マンション名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={data.name}
                onChange={(e) => { setStepError(null); setData({ ...data, name: e.target.value }) }}
                placeholder="例：サンシャインマンション"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住所
              </label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => setData({ ...data, address: e.target.value })}
                placeholder="例：東京都渋谷区○○1-2-3"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                総戸数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={data.unit_count}
                onChange={(e) => { setStepError(null); setData({ ...data, unit_count: e.target.value }) }}
                placeholder="例：50"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会計年度の開始月 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.fiscal_year_start}
                onChange={(e) => setData({ ...data, fiscal_year_start: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-400">
                多くの管理組合は 4月（4月〜翌3月）です。後から変更できません。
              </p>
            </div>

            {stepError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                {stepError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: 費用項目の設定 */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            費用項目の設定
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            毎月の徴収項目を選択してください。管理費・修繕積立金は全組合で必須です。
          </p>
          <div className="space-y-3">
            {/* 必須項目 */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-not-allowed">
              <input
                type="checkbox"
                checked
                disabled
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                管理費
                <span className="ml-2 text-xs text-gray-400 font-normal">（必須）</span>
              </span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-not-allowed">
              <input
                type="checkbox"
                checked
                disabled
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                修繕積立金
                <span className="ml-2 text-xs text-gray-400 font-normal">（必須）</span>
              </span>
            </label>

            {/* 任意項目 */}
            {(
              [
                { key: 'charge_type_common_fee' as const, label: '共用費' },
                { key: 'charge_type_parking' as const, label: '駐車場使用料' },
                { key: 'charge_type_bike_parking' as const, label: '自転車・バイク置き場使用料' },
                { key: 'charge_type_other' as const, label: 'その他', hasAlias: true },
              ] as Array<{ key: keyof WizardData; label: string; hasAlias?: boolean }>
            ).map(({ key, label, hasAlias }) => (
              <div key={key}>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={data[key] as boolean}
                    onChange={(e) => setData({ ...data, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
                {hasAlias && (data[key] as boolean) && (
                  <div className="mt-2 ml-10">
                    <input
                      type="text"
                      value={data.charge_type_other_alias}
                      onChange={(e) => setData({ ...data, charge_type_other_alias: e.target.value })}
                      placeholder="項目名を入力（例：専用庭使用料）"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: 銀行口座の設定 */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            銀行口座の設定
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            管理費の入金確認に使用する銀行を選択してください。銀行の明細データを取り込んで自動照合します。後から変更できます。
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="bank_preset"
                value="resona"
                checked={data.bank_preset === 'resona'}
                onChange={() => setData({ ...data, bank_preset: 'resona' })}
                className="w-4 h-4 accent-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">りそな銀行</span>
                <p className="text-xs text-gray-400 mt-0.5">標準フォーマットで自動設定されます</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="bank_preset"
                value=""
                checked={data.bank_preset === ''}
                onChange={() => setData({ ...data, bank_preset: '' })}
                className="w-4 h-4 accent-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">その他・後で設定する</span>
                <p className="text-xs text-gray-400 mt-0.5">設定画面からいつでも追加できます</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Step 4: 完了画面 */}
      {step === 4 && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">初期設定が完了しました！</h2>
          <p className="text-sm text-gray-500 mb-8">
            ダッシュボードから住民の登録や入金管理などの機能をご利用いただけます。
            <br />
            まずは住民台帳に部屋情報を登録してみましょう。
          </p>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
              {submitError}
            </p>
          )}

          <form action={() => submitAction(buildFormData())}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '登録中...' : 'ダッシュボードへ進む'}
            </button>
          </form>
        </div>
      )}

      {/* ナビゲーションボタン（Step 4 以外） */}
      {step < 4 && (
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            {step === 3 ? '内容を確認する' : '次へ'}
          </button>
        </div>
      )}
    </div>
  )
}
