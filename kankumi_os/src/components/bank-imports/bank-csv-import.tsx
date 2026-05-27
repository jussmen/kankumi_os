'use client'

import { useState, useTransition } from 'react'
import { importBankTransactions } from '@/app/actions/bank-imports'
import { parseByPresetKey, type ParsedRow } from '@/lib/bank-csv/parsers'

interface Mapper {
  id: string
  bank_name: string
  account_label: string | null
  preset_key: string | null
  encoding: string
}

interface Props {
  mappers: Mapper[]
}

function mapperLabel(m: Mapper) {
  return m.account_label ? `${m.account_label}（${m.bank_name}）` : m.bank_name
}

export function BankCsvImport({ mappers }: Props) {
  const [selectedMapperId, setSelectedMapperId] = useState(mappers[0]?.id ?? '')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<{ matched: number; unmatched: number; skipped: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedMapper = mappers.find(m => m.id === selectedMapperId)

  function resetFile() {
    setRows([])
    setFileName('')
    setParseError(null)
    setResult(null)
  }

  function handleMapperChange(id: string) {
    setSelectedMapperId(id)
    resetFile()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    setRows([])
    setResult(null)

    if (!selectedMapper?.preset_key) {
      setParseError('この口座は未対応の銀行フォーマットです。設定ページで銀行を設定してください。')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer
        const parsed = parseByPresetKey(selectedMapper.preset_key!, buffer, selectedMapper.encoding)
        setRows(parsed)
        if (parsed.length === 0) {
          setParseError('入金明細が見つかりませんでした。正しいCSVファイルか確認してください。')
        }
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'CSVのパースに失敗しました。')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleImport() {
    if (!selectedMapper || rows.length === 0) return
    startTransition(async () => {
      const res = await importBankTransactions({ mapperId: selectedMapper.id, filename: fileName, rows })
      if (res.error) {
        setParseError(res.error)
      } else {
        setRows([])
        setFileName('')
        setResult({ matched: res.matched, unmatched: res.unmatched, skipped: res.skipped })
      }
    })
  }

  if (mappers.length === 0) {
    return (
      <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
        銀行口座が設定されていません。設定ページで口座を登録してください。
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {result && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4">
          <p className="text-sm font-medium text-green-800 mb-2">インポート完了</p>
          <div className="space-y-0.5 text-sm text-green-700">
            <p>自動照合済: <span className="font-semibold">{result.matched}件</span></p>
            <p>未照合: <span className="font-semibold">{result.unmatched}件</span></p>
            {result.skipped > 0 && <p className="text-green-600">重複スキップ: {result.skipped}件</p>}
          </div>
          {result.unmatched > 0 && (
            <a
              href="/payments/transactions?status=unmatched"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              未照合を確認する ({result.unmatched}件) →
            </a>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">対象口座</label>
        {mappers.length === 1 ? (
          <p className="text-sm text-gray-700">{mapperLabel(mappers[0])}</p>
        ) : (
          <select
            value={selectedMapperId}
            onChange={e => handleMapperChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {mappers.map(m => <option key={m.id} value={m.id}>{mapperLabel(m)}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CSVファイルを選択
          {selectedMapper && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              （{selectedMapper.bank_name}のネットバンキングからダウンロードしたCSV）
            </span>
          )}
        </label>
        <input
          type="file"
          accept=".csv"
          key={selectedMapperId}
          onChange={handleFile}
          disabled={!selectedMapper?.preset_key}
          className="block text-sm text-gray-600 file:mr-4 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-50"
        />
      </div>

      {parseError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {rows.length > 0 && !parseError && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{rows.length}件</span>の入金明細を認識しました
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">日付</th>
                  <th className="px-3 py-2 text-left font-medium">摘要</th>
                  <th className="px-3 py-2 text-right font-medium">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{row.transaction_date}</td>
                    <td className="px-3 py-1.5 text-gray-600 max-w-[200px] truncate">{row.description}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-gray-800">
                      {row.amount.toLocaleString()}円
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 3 && (
              <p className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">他 {rows.length - 3}件</p>
            )}
          </div>
          <button
            onClick={handleImport}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '照合中...' : `${rows.length}件をインポートして照合`}
          </button>
        </div>
      )}
    </div>
  )
}
