'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Database } from '@/types/database'

type OccupancyStatus = Database['public']['Enums']['occupancy_status']
type SortKey = 'unit_number' | 'occupancy_status' | 'charge'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

const OCCUPANCY_STYLES: Record<OccupancyStatus, { label: string; className: string }> = {
  occupied: { label: '居住中', className: 'bg-green-100 text-green-700' },
  vacant: { label: '空室', className: 'bg-yellow-100 text-yellow-700' },
  excluded: { label: '対象外', className: 'bg-gray-100 text-gray-500' },
}

const OCCUPANCY_ORDER: Record<OccupancyStatus, number> = {
  occupied: 0,
  vacant: 1,
  excluded: 2,
}

export interface UnitRow {
  id: string
  unit_number: string
  occupancy_status: OccupancyStatus
  hasCharge: boolean
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
      } else if (sortKey === 'occupancy_status') {
        cmp = OCCUPANCY_ORDER[a.occupancy_status] - OCCUPANCY_ORDER[b.occupancy_status]
      } else if (sortKey === 'charge') {
        cmp = (a.hasCharge ? 0 : 1) - (b.hasCharge ? 0 : 1)
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
              <th className={thClass('occupancy_status')} onClick={() => handleSort('occupancy_status')}>
                入居状態
                <SortIndicator active={sortKey === 'occupancy_status'} dir={sortDir} />
              </th>
              <th className={thClass('charge')} onClick={() => handleSort('charge')}>
                月額料金
                <SortIndicator active={sortKey === 'charge'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageUnits.map((unit) => {
              const occ = OCCUPANCY_STYLES[unit.occupancy_status]
              return (
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
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${occ.className}`}
                    >
                      {occ.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {unit.hasCharge ? (
                      <span className="text-sm text-green-600 font-medium">✓ 設定済</span>
                    ) : canEdit ? (
                      <span className="text-sm text-gray-400">未設定</span>
                    ) : (
                      <span className="text-sm text-gray-400">未設定</span>
                    )}
                  </td>
                </tr>
              )
            })}
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
