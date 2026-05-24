import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams

  const now = new Date()
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  const orgId = membership.organization_id

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [{ data: checklistItems }, { data: calendarEvents }] = await Promise.all([
    supabase
      .from('annual_checklists')
      .select('id, title, scheduled_date, status')
      .eq('organization_id', orgId)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd),
    supabase
      .from('operations_calendar_events')
      .select('id, title, start_date')
      .eq('organization_id', orgId)
      .gte('start_date', monthStart)
      .lte('start_date', monthEnd),
  ])

  const eventsByDay = new Map<number, { title: string; type: 'checklist' | 'event'; status?: string }[]>()

  for (const item of checklistItems ?? []) {
    if (!item.scheduled_date) continue
    const day = parseInt(item.scheduled_date.slice(8, 10), 10)
    const existing = eventsByDay.get(day) ?? []
    existing.push({ title: item.title, type: 'checklist', status: item.status })
    eventsByDay.set(day, existing)
  }

  for (const event of calendarEvents ?? []) {
    const day = parseInt(event.start_date.slice(8, 10), 10)
    const existing = eventsByDay.get(day) ?? []
    existing.push({ title: event.title, type: 'event' })
    eventsByDay.set(day, existing)
  }

  const firstDayOfMonth = new Date(year, month - 1, 1)
  const startWeekday = firstDayOfMonth.getDay()

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ]

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7).concat(Array(7).fill(null)).slice(0, 7))
  }

  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()
  const isCurrentMonth = year === todayYear && month === todayMonth

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">業務カレンダー</h1>
        <Link href="/checklist" className="text-sm text-blue-600 hover:text-blue-800">
          ← 年間業務
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← 前月
        </Link>
        <span className="text-lg font-semibold text-gray-800">
          {year}年 {month}月
        </span>
        <Link
          href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          次月 →
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-medium ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {row.map((day, colIdx) => {
              const isToday = isCurrentMonth && day === todayDay
              const events = day ? (eventsByDay.get(day) ?? []) : []

              return (
                <div
                  key={colIdx}
                  className={`min-h-20 p-1.5 border-r border-gray-100 last:border-0 ${
                    !day ? 'bg-gray-50' : ''
                  } ${colIdx === 0 ? 'bg-red-50/30' : colIdx === 6 ? 'bg-blue-50/30' : ''}`}
                >
                  {day && (
                    <>
                      <div
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : colIdx === 0
                            ? 'text-red-500'
                            : colIdx === 6
                            ? 'text-blue-500'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map((ev, i) => (
                          <div
                            key={i}
                            className={`rounded px-1 py-0.5 text-xs truncate ${
                              ev.type === 'checklist'
                                ? ev.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : ev.status === 'skipped'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-xs text-gray-400 pl-1">+{events.length - 3}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
          <span>未完了業務</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span>完了業務</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" />
          <span>スキップ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span>イベント</span>
        </div>
      </div>
    </div>
  )
}
