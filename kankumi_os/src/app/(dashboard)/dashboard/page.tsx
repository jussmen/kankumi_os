import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organizations(unit_count)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  const org = membership?.organizations as { unit_count: number } | null

  return (
    <div className="px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard title="総戸数" value={org?.unit_count?.toString() ?? '—'} unit="戸" />
        <OverviewCard title="入金済み" value="—" unit="戸" />
        <OverviewCard title="未入金" value="—" unit="戸" />
        <OverviewCard title="今月の収入" value="—" unit="円" />
      </div>
    </div>
  )
}

function OverviewCard({
  title,
  value,
  unit,
}: {
  title: string
  value: string
  unit: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-800">
        {value}
        <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}
