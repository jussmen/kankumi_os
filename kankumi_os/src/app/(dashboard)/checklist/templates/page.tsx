import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { deleteChecklistTemplate, createChecklistTemplate } from '@/app/actions/checklist'
import { AddTemplateForm } from '@/components/checklist/add-template-form'

const BOARD_ROLES = ['admin', 'vice_president', 'treasurer', 'board_member']

export default async function ChecklistTemplatesPage() {
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

  const { organization_id: orgId, role } = membership
  const canEdit = BOARD_ROLES.includes(role)

  const { data: allTemplates } = await supabase
    .from('checklist_templates')
    .select('id, label, notes, organization_id, default_frequency')
    .order('label')

  const globalTemplates = (allTemplates ?? []).filter((t) => !t.organization_id)
  const orgTemplates = (allTemplates ?? []).filter((t) => t.organization_id === orgId)

  return (
    <div className="px-6 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/checklist" className="text-sm text-gray-500 hover:text-gray-700">
          ← 年間業務
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">テンプレート管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          「テンプレートから一括追加」で使われる項目を管理します。
        </p>
      </div>

      {/* カスタムテンプレート */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">カスタムテンプレート（この組合）</h2>
        {orgTemplates.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">まだカスタムテンプレートはありません。</p>
        ) : (
          <div className="space-y-2 mb-4">
            {orgTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  {t.notes && <p className="text-xs text-gray-400 truncate">{t.notes}</p>}
                </div>
                {canEdit && (
                  <form
                    action={async () => {
                      'use server'
                      await deleteChecklistTemplate(t.id)
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 transition-colors shrink-0"
                    >
                      削除
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && <AddTemplateForm action={createChecklistTemplate} />}
      </section>

      {/* システムテンプレート */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          システムテンプレート
          <span className="ml-2 text-xs font-normal text-gray-400">（変更不可）</span>
        </h2>
        <div className="space-y-2">
          {globalTemplates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{t.label}</p>
                {t.notes && <p className="text-xs text-gray-400 truncate">{t.notes}</p>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">システム</span>
            </div>
          ))}
          {globalTemplates.length === 0 && (
            <p className="text-sm text-gray-400">システムテンプレートはありません。</p>
          )}
        </div>
      </section>
    </div>
  )
}
