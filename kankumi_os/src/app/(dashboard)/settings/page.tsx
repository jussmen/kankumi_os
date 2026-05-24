import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()
  if (!membership) redirect('/onboarding')

  if (membership.role !== 'admin') redirect('/dashboard')

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">組合設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理組合の各種設定を管理します。</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
        <Link
          href="/settings/members"
          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <h2 className="text-base font-semibold text-gray-800">メンバー管理</h2>
          <p className="text-sm text-gray-500">
            組合メンバーの招待・ロール変更・削除を行います。
          </p>
        </Link>
      </div>
    </div>
  )
}
