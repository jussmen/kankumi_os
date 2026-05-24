import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const yearMonth = searchParams.get('year_month')

  let query = supabase
    .from('payment_records')
    .select('year_month, status, paid_amount, units!inner(unit_number)')
    .eq('organization_id', membership.organization_id)
    .order('year_month', { ascending: false })

  if (yearMonth) {
    query = query.eq('year_month', yearMonth)
  }

  const { data: records } = await query

  const statusLabel: Record<string, string> = {
    confirmed: '入金確認',
    missing: '未入金',
    irregular: '差異あり',
    excluded: '除外',
  }

  const rows = (records ?? []).map((r) => {
    const unit = r.units as unknown as { unit_number: string }
    return [
      unit?.unit_number ?? '',
      r.year_month,
      statusLabel[r.status] ?? r.status,
      String(r.paid_amount),
    ]
  })

  const filename = yearMonth ? `payments_${yearMonth}.csv` : 'payments.csv'
  const bom = '﻿'
  const csv = bom + toCsv(['部屋番号', '年月', 'ステータス', '入金額'], rows)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
