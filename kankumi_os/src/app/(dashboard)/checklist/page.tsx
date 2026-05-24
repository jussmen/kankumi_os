import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { seedChecklistFromTemplates } from '@/app/actions/checklist'
import { ChecklistItemRow } from '@/components/checklist/checklist-item-row'
import { AddChecklistForm } from '@/components/checklist/add-checklist-form'

interface PageProps {
  searchParams: Promise<{ fiscal_year_id?: string }>
}

export default async function ChecklistPage({ searchParams }: PageProps) {
  const params = await searchParams

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

  const { data: fiscalYears } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date, status')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })

  if (!fiscalYears || fiscalYears.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">年間業務</h1>
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">会計年度がまだ設定されていません。</p>
          <Link
            href="/checklist/new-fiscal-year"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            会計年度を作成
          </Link>
        </div>
      </div>
    )
  }

  const activeFiscalYear = fiscalYears.find((fy) => fy.status === 'active')
  const selectedId = params.fiscal_year_id ?? activeFiscalYear?.id ?? fiscalYears[0].id
  const selectedYear = fiscalYears.find((fy) => fy.id === selectedId) ?? fiscalYears[0]

  const { data: checklist } = await supabase
    .from('annual_checklists')
    .select('id, title, status, scheduled_date, notes, template_id')
    .eq('organization_id', orgId)
    .eq('fiscal_year_id', selectedYear.id)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('id')

  const hasItems = (checklist ?? []).length > 0
  const hasTemplates = (templates ?? []).length > 0
  const seeded = hasItems

  const pending = (checklist ?? []).filter((i) => i.status === 'pending').length
  const completed = (checklist ?? []).filter((i) => i.status === 'completed').length
  const skipped = (checklist ?? []).filter((i) => i.status === 'skipped').length
  const total = (checklist ?? []).length

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">年間業務</h1>
        <Link
          href="/checklist/new-fiscal-year"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          + 会計年度
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">会計年度</label>
        <div className="relative">
          <select
            className="rounded-md border border-gray-300 pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            defaultValue={selectedYear.id}
            onChange={(e) => {
              window.location.href = `/checklist?fiscal_year_id=${e.target.value}`
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
        <Link href="/calendar" className="ml-auto text-sm text-blue-600 hover:text-blue-800">
          カレンダーで見る →
        </Link>
      </div>

      {total > 0 && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="text-gray-500">全 {total} 件</span>
          <span className="text-green-600">完了 {completed}</span>
          <span className="text-gray-500">未完了 {pending}</span>
          <span className="text-yellow-600">スキップ {skipped}</span>
          {total > 0 && (
            <span className="text-gray-400">
              進捗 {Math.round((completed / total) * 100)}%
            </span>
          )}
        </div>
      )}

      {!seeded && hasTemplates && (
        <form
          action={async () => {
            'use server'
            await seedChecklistFromTemplates(selectedYear.id)
          }}
          className="mb-4"
        >
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            テンプレートから一括追加
          </button>
        </form>
      )}

      <div className="space-y-2 mb-4">
        {(checklist ?? []).map((item) => (
          <ChecklistItemRow key={item.id} item={item} />
        ))}
      </div>

      {(checklist ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center mb-4">
          <p className="text-gray-500 text-sm">チェックリスト項目がまだありません。</p>
        </div>
      )}

      <AddChecklistForm fiscalYearId={selectedYear.id} />
    </div>
  )
}
