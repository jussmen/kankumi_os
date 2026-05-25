import { createClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = ['admin', 'vice_president', 'treasurer', 'auditor']

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export async function GET() {
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

  const { data: units } = await supabase
    .from('units')
    .select('unit_number, occupancy_status')
    .eq('organization_id', membership.organization_id)
    .order('unit_number')

  const statusLabel: Record<string, string> = {
    occupied: '居住中',
    vacant: '空室',
    excluded: '除外',
  }

  const rows = (units ?? []).map((u) => [
    u.unit_number ?? '',
    statusLabel[u.occupancy_status] ?? u.occupancy_status,
  ])

  const bom = '﻿'
  const csv = bom + toCsv(['部屋番号', '入居状態'], rows)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="units.csv"',
    },
  })
}
