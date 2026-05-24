import Link from 'next/link'
import { createAnnouncement } from '@/app/actions/announcements'
import { AnnouncementForm } from '@/components/announcements/announcement-form'

export default function NewAnnouncementPage() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/announcements" className="text-sm text-gray-500 hover:text-gray-700">
          ← お知らせ
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">新規作成</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AnnouncementForm action={createAnnouncement} submitLabel="作成" />
      </div>
    </div>
  )
}
