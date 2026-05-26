import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type TopicStatus = Database['public']['Enums']['topic_status']
type TopicType = Database['public']['Enums']['topic_type']
type Priority = Database['public']['Enums']['priority']

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'board_member']

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
const PRIORITY_LABELS: Record<Priority, string> = { urgent: '緊急', high: '高', normal: '通常', low: '低' }
const PRIORITY_STYLES: Record<Priority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-gray-100 text-gray-600',
  low: 'bg-gray-50 text-gray-400',
}
const TYPE_LABELS: Record<TopicType, string> = {
  board_meeting: '理事会',
  general: '一般',
  issue: '課題',
  notice: '告知',
  task: 'タスク',
}
const CHECKLIST_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: '未着手', className: 'bg-gray-100 text-gray-500' },
  in_progress: { label: '進行中', className: 'bg-yellow-100 text-yellow-700' },
  done: { label: '完了', className: 'bg-green-100 text-green-700' },
}

const COST_CYCLE_LABELS: Record<string, string> = {
  monthly: '月額',
  annual: '年額',
  one_time: '一時',
}

const VENDOR_CATEGORY_LABELS: Record<string, string> = {
  cleaning: '清掃',
  equipment_maintenance: '設備保守',
  legal_inspection: '法定点検',
  insurance: '保険',
  landscaping: '植栽外構',
  renovation: '修繕工事',
  security: '警備',
  other: 'その他',
}

function fmt(n: number) {
  return n.toLocaleString('ja-JP')
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default async function HandoverPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')
  if (!ALLOWED_ROLES.includes(membership.role)) redirect('/dashboard')

  const { organization_id: orgId } = membership

  const [
    { data: openTopics },
    { data: resolvedTopics },
    { data: fiscalYears },
    { data: contracts },
  ] = await Promise.all([
    supabase
      .from('topics')
      .select('id, title, type, priority, status, due_date')
      .eq('organization_id', orgId)
      .in('status', ['open', 'in_progress'])
      .order('priority')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('topics')
      .select('id, title, type, resolution, updated_at')
      .eq('organization_id', orgId)
      .in('status', ['resolved', 'closed'])
      .not('resolution', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('fiscal_years')
      .select('id, year, start_date, end_date, status')
      .eq('organization_id', orgId)
      .order('year', { ascending: false }),
    supabase
      .from('vendor_contracts')
      .select('id, service_description, cost_amount, cost_cycle, renewal_date, auto_renewal, vendors(name, category, custom_category, contact_phone)')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('renewal_date', { ascending: true, nullsFirst: false }),
  ])

  const currentFy = (fiscalYears ?? []).find((fy) => fy.status === 'open') ?? (fiscalYears ?? [])[0]

  const [{ data: checklists }, { data: expenses }, { data: budgets }] = currentFy
    ? await Promise.all([
        supabase
          .from('annual_checklists')
          .select('id, title, scheduled_date, status, vendor_contract_id')
          .eq('organization_id', orgId)
          .eq('fiscal_year_id', currentFy.id)
          .order('scheduled_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('expenses')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('fiscal_year_id', currentFy.id),
        supabase
          .from('budgets')
          .select('budgeted_amount')
          .eq('fiscal_year_id', currentFy.id),
      ])
    : [
        { data: [] as { id: string; title: string; scheduled_date: string | null; status: string; vendor_contract_id: string | null }[] },
        { data: [] as { amount: number }[] },
        { data: [] as { budgeted_amount: number }[] },
      ]

  const totalExpense = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const totalBudget = (budgets ?? []).reduce((s, b) => s + Number(b.budgeted_amount), 0)

  const today = new Date().toISOString().split('T')[0]
  const sortedOpenTopics = (openTopics ?? []).sort(
    (a, b) =>
      PRIORITY_ORDER[a.priority as Priority] - PRIORITY_ORDER[b.priority as Priority] ||
      (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1
  )

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">理事向け引継書</h1>
        <p className="text-sm text-gray-500 mt-1">
          理事交代時の引継ぎ資料 — 課題・決定事項・業務・財務・業者
        </p>
      </div>

      {/* セクション1: 継続中の課題 */}
      <Section title="継続中の課題" count={sortedOpenTopics.length}>
        {sortedOpenTopics.length === 0 ? (
          <EmptyRow>継続中の課題はありません。</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">タイトル</th>
                <th className="px-3 py-2 text-left font-medium">種別</th>
                <th className="px-3 py-2 text-left font-medium">優先度</th>
                <th className="px-3 py-2 text-left font-medium">期限</th>
                <th className="px-3 py-2 text-left font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOpenTopics.map((t) => {
                const isOverdue = t.due_date && t.due_date < today
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/topics/${t.id}`} className="text-blue-600 hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{TYPE_LABELS[t.type as TopicType]}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[t.priority as Priority]}`}>
                        {PRIORITY_LABELS[t.priority as Priority]}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {t.due_date ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-50 text-blue-600'}`}>
                        {t.status === 'in_progress' ? '進行中' : '未着手'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* セクション2: 今年度の決定事項 */}
      <Section title="今年度の決定事項" count={(resolvedTopics ?? []).length}>
        {(resolvedTopics ?? []).length === 0 ? (
          <EmptyRow>決定事項の記録はありません。</EmptyRow>
        ) : (
          <div className="divide-y divide-gray-100">
            {(resolvedTopics ?? []).map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/topics/${t.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
                    {t.title}
                  </Link>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(t.updated_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{t.resolution}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* セクション3: 年間業務スケジュール */}
      <Section
        title={`年間業務スケジュール${currentFy ? `（${currentFy.year}年度）` : ''}`}
        count={(checklists ?? []).length}
      >
        {!currentFy ? (
          <EmptyRow>会計年度が設定されていません。</EmptyRow>
        ) : (checklists ?? []).length === 0 ? (
          <EmptyRow>年間業務が登録されていません。</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">業務名</th>
                <th className="px-3 py-2 text-left font-medium">予定日</th>
                <th className="px-3 py-2 text-left font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(checklists ?? []).map((c) => {
                const st = CHECKLIST_STATUS[c.status] ?? CHECKLIST_STATUS.pending
                const isOverdue = c.status !== 'done' && c.scheduled_date && c.scheduled_date < today
                return (
                  <tr key={c.id} className={isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 text-gray-800">{c.title}</td>
                    <td className={`px-3 py-2 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {c.scheduled_date ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* セクション4: 財務サマリー */}
      <Section title={`財務サマリー${currentFy ? `（${currentFy.year}年度）` : ''}`}>
        {!currentFy ? (
          <EmptyRow>会計年度が設定されていません。</EmptyRow>
        ) : (
          <div className="px-4 py-4 grid grid-cols-3 gap-4">
            <StatCard label="予算合計" value={`¥${fmt(totalBudget)}`} />
            <StatCard label="支出合計" value={`¥${fmt(totalExpense)}`} />
            <StatCard
              label="予算残"
              value={`¥${fmt(totalBudget - totalExpense)}`}
              sub={totalBudget > 0 ? `${Math.round(((totalBudget - totalExpense) / totalBudget) * 100)}%残` : undefined}
              highlight={totalExpense > totalBudget}
            />
          </div>
        )}
        {currentFy && (
          <div className="px-4 pb-3">
            <Link href="/accounting/report" className="text-xs text-blue-600 hover:underline">
              詳細レポートを見る →
            </Link>
          </div>
        )}
      </Section>

      {/* セクション5: 業者・契約情報 */}
      <Section title="業者・契約情報" count={(contracts ?? []).length}>
        {(contracts ?? []).length === 0 ? (
          <EmptyRow>登録済みの業者契約はありません。</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">業者名</th>
                <th className="px-3 py-2 text-left font-medium">サービス</th>
                <th className="px-3 py-2 text-left font-medium">費用</th>
                <th className="px-3 py-2 text-left font-medium">連絡先</th>
                <th className="px-3 py-2 text-left font-medium">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(contracts ?? []).map((c) => {
                const vendor = Array.isArray(c.vendors) ? c.vendors[0] : c.vendors
                const days = c.renewal_date ? daysUntil(c.renewal_date) : null
                const renewalUrgency =
                  days !== null && days <= 30
                    ? 'text-red-600 font-medium'
                    : days !== null && days <= 90
                    ? 'text-yellow-600 font-medium'
                    : 'text-gray-500'
                const categoryLabel =
                  vendor?.category === 'other'
                    ? vendor.custom_category ?? 'その他'
                    : VENDOR_CATEGORY_LABELS[vendor?.category ?? ''] ?? ''

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="text-gray-800 font-medium">{vendor?.name ?? '—'}</p>
                      {categoryLabel && (
                        <p className="text-xs text-gray-400">{categoryLabel}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs max-w-[200px]">
                      {c.service_description ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                      {c.cost_amount
                        ? `¥${fmt(Number(c.cost_amount))} / ${COST_CYCLE_LABELS[c.cost_cycle ?? ''] ?? c.cost_cycle}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {vendor?.contact_phone ?? '—'}
                    </td>
                    <td className={`px-3 py-2 text-xs ${renewalUrgency}`}>
                      {c.renewal_date ?? '—'}
                      {days !== null && days <= 90 && (
                        <span className="ml-1">({days}日後)</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="px-4 pb-3 pt-2">
          <Link href="/settings/vendors" className="text-xs text-blue-600 hover:underline">
            業者管理を開く →
          </Link>
        </div>
      </Section>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className="text-xs text-gray-400">{count}件</span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-6 text-sm text-gray-400 text-center">{children}</p>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
