'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importUnits } from '@/app/actions/units'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']

interface ParsedRow {
  unit_number: string
  occupancy_status: OccupancyStatus
  _error?: string
}

const OCCUPANCY_MAP: Record<string, OccupancyStatus> = {
  occupied: 'occupied',
  居住中: 'occupied',
  vacant: 'vacant',
  空室: 'vacant',
  excluded: 'excluded',
  対象外: 'excluded',
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const [unitNumber, statusRaw] = cols

    if (!unitNumber) continue

    const occupancyStatus = OCCUPANCY_MAP[statusRaw] ?? 'occupied'

    rows.push({
      unit_number: unitNumber,
      occupancy_status: occupancyStatus,
      _error: !unitNumber ? '部屋番号が空です' : undefined,
    })
  }
  return rows
}

const TEMPLATE_CSV =
  '部屋番号,入居状態\n101,居住中\n102,空室\n201,居住中\n'

const OCCUPANCY_LABELS: Record<OccupancyStatus, string> = {
  occupied: '居住中',
  vacant: '空室',
  excluded: '対象外',
}

export function CsvImport() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'units_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRows(parseCSV(text))
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleConfirm() {
    const validRows = rows.filter((r) => !r._error)
    startTransition(async () => {
      const res = await importUnits(validRows)
      if (res.error) {
        setResult(res.error)
      } else {
        router.push(`/units?imported=${res.count}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={downloadTemplate}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          テンプレートCSVをダウンロード
        </button>
        <span className="text-sm text-gray-500">
          ダウンロードしたCSVを編集してアップロードしてください
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CSVファイルを選択
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="block text-sm text-gray-600 file:mr-4 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
        />
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{fileName}</span> — {rows.length}行 プレビュー
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">部屋番号</th>
                  <th className="px-4 py-2 text-left font-medium">入居状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row._error ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.unit_number}
                      {row._error && (
                        <span className="ml-2 text-xs text-red-600">{row._error}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {OCCUPANCY_LABELS[row.occupancy_status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {result}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={isPending || rows.every((r) => !!r._error)}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'インポート中...' : `${rows.filter((r) => !r._error).length}件をインポート`}
            </button>
            <button
              onClick={() => { setRows([]); setFileName('') }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
