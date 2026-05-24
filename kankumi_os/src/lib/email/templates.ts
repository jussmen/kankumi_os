export function announcementEmail(opts: {
  title: string
  body: string
  orgName: string
}): string {
  const { title, body, orgName } = opts
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1d4ed8;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:13px;">${orgName}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;">お知らせ</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">${title}</h2>
              <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${body}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;font-size:12px;color:#9ca3af;">
              このメールは ${orgName} の管理システム Kankumi OS から自動送信されました。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function taskReminderEmail(opts: {
  title: string
  dueDate: string
  orgName: string
}): string {
  const { title, dueDate, orgName } = opts
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>タスクリマインダー</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#d97706;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:13px;">${orgName}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;">タスクリマインダー</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;">明日が期限のタスクがあります。</p>
              <table width="100%" cellpadding="12" cellspacing="0" style="background:#fef3c7;border-radius:6px;border-left:4px solid #d97706;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#92400e;">${title}</p>
                    <p style="margin:0;font-size:13px;color:#92400e;">期限: ${dueDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px;font-size:12px;color:#9ca3af;">
              このメールは ${orgName} の管理システム Kankumi OS から自動送信されました。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
