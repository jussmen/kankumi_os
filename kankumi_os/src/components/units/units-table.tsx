'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
type SortKey = 'unit_number' | 'charge'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

export interface UnitRow {
  id: string
  unit_number: string
  hasCharge: boolean
  chargeConfirmed: boolean
}

interface UnitsTableProps {
  units: UnitRow[]
  canEdit: boolean
}

function naturalCompare(a: string, b: string): number {
  const re = /(\d+)/g
  const aParts = a.split(re)
  const bParts = b.split(re)
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const ap = aParts[i] ?? ''
    const bp = bParts[i] ?? ''
    const an = parseInt(ap, 10)
    const bn = parseInt(bp, 10)
    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn
    } else {
      const cmp = ap.localeCompare(bp, 'ja')
      if (cmp !== 0) return cmp
    }
  }
  return 0
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function UnitsTable({ units, canEdit }: UnitsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('unit_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const sorted = useMemo(() => {
    return [...units].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'unit_number') {
        cmp = naturalCompare(a.unit_number, b.unit_number)
      } else if (sortKey === 'charge') {
        const score = (u: UnitRow) => u.chargeConfirmed ? 0 : u.hasCharge ? 1 : 2
        cmp = score(a) - score(b)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [units, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const offset = (page - 1) * PAGE_SIZE
  const pageUnits = sorted.slice(offset, offset + PAGE_SIZE)

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-gray-900 transition-colors ${
      sortKey === key ? 'text-gray-900' : 'text-gray-500'
    }`

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass('unit_number')} onClick={() => handleSort('unit_number')}>
                部屋番号
                <SortIndicator active={sortKey === 'unit_number'} dir={sortDir} />
              </th>
              <th className={thClass('charge')} onClick={() => handleSort('charge')}>
                台帳ステータス
                <SortIndicator active={sortKey === 'charge'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageUnits.map((unit) => (
              <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/units/${unit.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {unit.unit_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {unit.chargeConfirmed ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">台帳有効</span>
                  ) : unit.hasCharge ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">要確認</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">未設定</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, sorted.length)} / {sorted.length}件
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
              >
                ← 前へ
              </button>
            )}
            {page < totalPages && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
              >
                次へ →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
