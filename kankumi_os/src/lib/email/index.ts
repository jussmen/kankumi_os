import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<void> {
  if (!resend) return // キーなし = 開発環境はスキップ
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@kankumi.app',
    ...opts,
  })
}
