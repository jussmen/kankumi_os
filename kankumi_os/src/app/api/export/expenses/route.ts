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
  const fiscalYearId = searchParams.get('fiscal_year_id')

  let query = supabase
    .from('expenses')
    .select('expense_date, amount, vendor, description, expense_categories!inner(name, account_type)')
    .eq('organization_id', membership.organization_id)
    .order('expense_date', { ascending: false })

  if (fiscalYearId) {
    query = query.eq('fiscal_year_id', fiscalYearId)
  }

  const { data: expenses } = await query

  const accountTypeLabel: Record<string, string> = {
    management: '管理費会計',
    reserve_fund: '修繕積立金会計',
  }

  const rows = (expenses ?? []).map((e) => {
    const cat = e.expense_categories as unknown as { name: string; account_type: string }
    return [
      e.expense_date,
      cat?.name ?? '',
      accountTypeLabel[cat?.account_type] ?? '',
      String(e.amount),
      e.vendor ?? '',
      e.description ?? '',
    ]
  })

  const bom = '﻿'
  const csv = bom + toCsv(['日付', '科目名', '会計区分', '金額', '支払先', '備考'], rows)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="expenses.csv"',
    },
  })
}
