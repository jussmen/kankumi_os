'use client'

interface FiscalYear {
  id: string
  year: number
  start_date: string
  end_date: string
  status: string
}

interface FiscalYearSelectProps {
  fiscalYears: FiscalYear[]
  defaultValue: string
  basePath?: string
}

export function FiscalYearSelect({ fiscalYears, defaultValue, basePath = '/checklist' }: FiscalYearSelectProps) {
  return (
    <div className="relative">
      <select
        className="rounded-md border border-gray-300 pl-3 pr-8 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        defaultValue={defaultValue}
        onChange={(e) => {
          window.location.href = `${basePath}?fiscal_year_id=${e.target.value}`
        }}
      >
        {fiscalYears.map((fy) => (
          <option key={fy.id} value={fy.id}>
            {fy.year}年度 ({fy.start_date} 〜 {fy.end_date})
            {fy.status === 'active' ? ' [進行中]' : ' [完了]'}
          </option>
        ))}
      </select>
    </div>
  )
}
