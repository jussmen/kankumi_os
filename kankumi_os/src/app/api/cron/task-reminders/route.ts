import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { taskReminderEmail } from '@/lib/email/templates'

// GET /api/cron/task-reminders
// Authorization: Bearer ${CRON_SECRET}
// 期限が明日のタスクの担当者にリマインダーを送信
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()

  // 明日の日付（YYYY-MM-DD）
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // 期限が明日かつ担当者がいるタスクを取得
  const { data: tasks, error: tasksError } = await adminClient
    .from('tasks')
    .select('id, title, due_date, assignee_id, organization_id')
    .eq('due_date', tomorrowStr)
    .not('assignee_id', 'is', null)
    .neq('status', 'done')

  if (tasksError || !tasks || tasks.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 組合名を一括取得
  const orgIds = [...new Set(tasks.map((t) => t.organization_id))]
  const { data: orgs } = await adminClient
    .from('organizations')
    .select('id, name')
    .in('id', orgIds)

  const orgNameMap: Record<string, string> = {}
  for (const org of orgs ?? []) {
    orgNameMap[org.id] = org.name
  }

  // 担当者のメールアドレスを取得
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  })

  if (usersError || !usersData) {
    return NextResponse.json({ sent: 0 })
  }

  const userEmailMap: Record<string, string> = {}
  for (const u of usersData.users) {
    if (u.email) userEmailMap[u.id] = u.email
  }

  let sent = 0
  for (const task of tasks) {
    const assigneeId = task.assignee_id as string
    const email = userEmailMap[assigneeId]
    if (!email) continue

    const orgName = orgNameMap[task.organization_id] ?? '管理組合'
    const html = taskReminderEmail({
      title: task.title,
      dueDate: tomorrowStr,
      orgName,
    })

    try {
      await sendEmail({
        to: email,
        subject: `【${orgName}】タスクリマインダー: ${task.title}`,
        html,
      })
      sent++
    } catch (err) {
      console.error('[task-reminders] メール送信エラー:', task.id, err)
    }
  }

  return NextResponse.json({ sent })
}
