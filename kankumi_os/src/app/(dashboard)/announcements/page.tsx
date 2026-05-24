import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { publishAnnouncement, unpublishAnnouncement } from '@/app/actions/announcements'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']
type Announcement = Database['public']['Tables']['announcements']['Row']

function isAdmin(role: MemberRole) {
  return ['admin', 'vice_president', 'treasurer', 'board_member'].includes(role)
}

function isExpired(a: Announcement): boolean {
  if (!a.expires_at) return false
  return new Date(a.expires_at) < new Date()
}

export default async function AnnouncementsPage() {
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

  const { orgId, role } = { orgId: membership.organization_id, role: membership.role }
  const admin = isAdmin(role)
  const now = new Date().toISOString()

  let query = supabase
    .from('announcements')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (!admin) {
    query = query
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .eq('visibility', 'all_members')
  }

  const { data: allRows } = await query

  const announcements = (allRows ?? []).filter((a) => {
    if (!admin && a.expires_at && new Date(a.expires_at) < new Date()) return false
    return true
  })

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">お知らせ</h1>
        {admin && (
          <Link
            href="/announcements/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + 作成
          </Link>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm mb-4">お知らせがまだありません。</p>
          {admin && (
            <Link href="/announcements/new" className="text-sm text-blue-600 hover:underline">
              最初のお知らせを作成
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => {
            const isDraft = !a.published_at
            const expired = isExpired(a)

            return (
              <div
                key={a.id}
                className={`bg-white rounded-lg border border-gray-200 px-5 py-4 transition-all ${
                  expired ? 'bg-gray-50' : ''
                } ${isDraft ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {isDraft && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          下書き
                        </span>
                      )}
                      {expired && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                          期限切れ
                        </span>
                      )}
                      {a.visibility === 'board_only' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          理事のみ
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/announcements/${a.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 block truncate"
                    >
                      {a.title}
                    </Link>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {a.published_at
                          ? `公開: ${new Date(a.published_at).toLocaleDateString('ja-JP')}`
                          : '未公開'}
                      </span>
                      {a.expires_at && (
                        <span className="text-xs text-gray-400">
                          終了: {new Date(a.expires_at).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>

                  {admin && (
                    <div className="flex gap-2 shrink-0">
                      {isDraft ? (
                        <form action={publishAnnouncement.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="rounded border border-blue-300 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            公開
                          </button>
                        </form>
                      ) : (
                        <form action={unpublishAnnouncement.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            下書きに戻す
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
