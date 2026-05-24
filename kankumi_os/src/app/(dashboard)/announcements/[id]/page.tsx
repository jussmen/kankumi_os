import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  updateAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
  deleteAnnouncement,
} from '@/app/actions/announcements'
import { AnnouncementForm } from '@/components/announcements/announcement-form'
import type { Database } from '@/types/database'

type MemberRole = Database['public']['Enums']['member_role']

function isAdmin(role: MemberRole) {
  return ['admin', 'vice_president', 'treasurer', 'board_member'].includes(role)
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function AnnouncementDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

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

  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!announcement) notFound()

  const now = new Date()
  const isDraft = !announcement.published_at
  const isPublished = !isDraft && new Date(announcement.published_at!) <= now
  const isExpired = announcement.expires_at
    ? new Date(announcement.expires_at) < now
    : false

  if (!admin) {
    if (isDraft) notFound()
    if (!isPublished) notFound()
    if (announcement.visibility === 'board_only') notFound()
    if (isExpired) notFound()
  }

  const isEditing = edit === '1' && admin
  const updateAnnouncementWithId = updateAnnouncement.bind(null, id)

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-4">
        <Link href="/announcements" className="text-sm text-gray-500 hover:text-gray-700">
          ← お知らせ
        </Link>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">編集</h2>
          <AnnouncementForm
            action={updateAnnouncementWithId}
            defaultValues={announcement}
            submitLabel="更新"
            cancelHref={`/announcements/${id}`}
          />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {isDraft && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      下書き
                    </span>
                  )}
                  {isPublished && !isExpired && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      公開中
                    </span>
                  )}
                  {isExpired && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                      期限切れ
                    </span>
                  )}
                  {announcement.visibility === 'board_only' && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      理事のみ
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-gray-900">{announcement.title}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {announcement.published_at && (
                    <span className="text-xs text-gray-500">
                      公開: {new Date(announcement.published_at).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                  {announcement.expires_at && (
                    <span className="text-xs text-gray-500">
                      終了: {new Date(announcement.expires_at).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    作成: {new Date(announcement.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>

              {admin && (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/announcements/${id}?edit=1`}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    編集
                  </Link>
                </div>
              )}
            </div>

            {admin && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                {isDraft ? (
                  <form action={publishAnnouncement.bind(null, id)}>
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      公開する
                    </button>
                  </form>
                ) : (
                  <form action={unpublishAnnouncement.bind(null, id)}>
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      下書きに戻す
                    </button>
                  </form>
                )}
                <form action={deleteAnnouncement.bind(null, id)}>
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    onClick={(e) => {
                      if (!confirm('このお知らせを削除しますか？')) e.preventDefault()
                    }}
                  >
                    削除
                  </button>
                </form>
              </div>
            )}
          </div>

          {announcement.body && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{announcement.body}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
