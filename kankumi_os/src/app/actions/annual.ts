'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!data) redirect('/onboarding')
  return { supabase, orgId: data.organization_id, userId: user.id, role: data.role }
}

function monthsBetween(startDate: string, endDate: string): string[] {
  const months: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

export interface UnitAnnualRow {
  unitId: string
  unitNumber: string
  expectedTotal: number
  actualTotal: number
  diff: number
  monthCount: number
}

export interface AnnualAccumulationResult {
  fiscalYearId: string
  yearLabel: string
  startDate: string
  endDate: string
  rows: UnitAnnualRow[]
  updatedToConfirmed: number
  totalExpected: number
  totalActual: number
  error: string | null
}

export async function computeAnnualAccumulation(
  fiscalYearId: string,
  _prevState: AnnualAccumulationResult | null,
  _formData: FormData
): Promise<AnnualAccumulationResult> {
  const { supabase, orgId, role } = await getContext()

  const allowed = ['admin', 'vice_president', 'treasurer', 'auditor']
  if (!allowed.includes(role)) {
    return {
      fiscalYearId,
      yearLabel: '',
      startDate: '',
      endDate: '',
      rows: [],
      updatedToConfirmed: 0,
      totalExpected: 0,
      totalActual: 0,
      error: '権限がありません。',
    }
  }

  const { data: fy } = await supabase
    .from('fiscal_years')
    .select('id, year, start_date, end_date')
    .eq('id', fiscalYearId)
    .eq('organization_id', orgId)
    .single()

  if (!fy) {
    return {
      fiscalYearId,
      yearLabel: '',
      startDate: '',
      endDate: '',
      rows: [],
      updatedToConfirmed: 0,
      totalExpected: 0,
      totalActual: 0,
      error: '会計年度が見つかりません。',
    }
  }

  const months = monthsBetween(fy.start_date, fy.end_date)

  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgId)
    .neq('occupancy_status', 'excluded')
    .order('unit_number')

  const unitIds = (units ?? []).map((u) => u.id)
  if (unitIds.length === 0) {
    return {
      fiscalYearId,
      yearLabel: `${fy.year}年度`,
      startDate: fy.start_date,
      endDate: fy.end_date,
      rows: [],
      updatedToConfirmed: 0,
      totalExpected: 0,
      totalActual: 0,
      error: null,
    }
  }

  const [{ data: charges }, { data: paymentRecords }] = await Promise.all([
    supabase
      .from('unit_charges')
      .select('unit_id, amount, effective_from, effective_to')
      .eq('organization_id', orgId)
      .in('unit_id', unitIds),
    supabase
      .from('payment_records')
      .select('id, unit_id, year_month, status, paid_amount')
      .eq('organization_id', orgId)
      .in('unit_id', unitIds)
      .in('year_month', months),
  ])

  // Group payment records by unit
  const payByUnit = new Map<string, { id: string; year_month: string; status: string; paid_amount: number }[]>()
  for (const r of paymentRecords ?? []) {
    if (!payByUnit.has(r.unit_id)) payByUnit.set(r.unit_id, [])
    payByUnit.get(r.unit_id)!.push({ ...r, paid_amount: Number(r.paid_amount) })
  }

  const rows: UnitAnnualRow[] = []
  const canWrite = ['admin', 'vice_president', 'treasurer'].includes(role)
  let updatedToConfirmed = 0

  for (const unit of units ?? []) {
    let expectedTotal = 0

    for (const ym of months) {
      const refDate = `${ym}-15`
      const monthCharge = (charges ?? [])
        .filter((c) => {
          if (c.unit_id !== unit.id) return false
          if (c.effective_from > refDate) return false
          if (c.effective_to && c.effective_to < refDate) return false
          return true
        })
        .reduce((sum, c) => sum + Number(c.amount), 0)
      expectedTotal += monthCharge
    }

    const unitRecords = payByUnit.get(unit.id) ?? []
    const actualTotal = unitRecords
      .filter((r) => r.status === 'confirmed' || r.status === 'irregular')
      .reduce((sum, r) => sum + r.paid_amount, 0)

    // If annual totals match, upgrade irregular → confirmed
    if (canWrite && expectedTotal > 0 && actualTotal === expectedTotal) {
      const irregularIds = unitRecords
        .filter((r) => r.status === 'irregular')
        .map((r) => r.id)

      if (irregularIds.length > 0) {
        await supabase
          .from('payment_records')
          .update({ status: 'confirmed', has_irregularity_flag: false })
          .in('id', irregularIds)

        updatedToConfirmed += irregularIds.length
      }
    }

    rows.push({
      unitId: unit.id,
      unitNumber: unit.unit_number,
      expectedTotal,
      actualTotal,
      diff: actualTotal - expectedTotal,
      monthCount: months.length,
    })
  }

  if (updatedToConfirmed > 0) {
    revalidatePath('/payments')
    revalidatePath('/accounting/annual')
  }

  return {
    fiscalYearId,
    yearLabel: `${fy.year}年度`,
    startDate: fy.start_date,
    endDate: fy.end_date,
    rows,
    updatedToConfirmed,
    totalExpected: rows.reduce((s, r) => s + r.expectedTotal, 0),
    totalActual: rows.reduce((s, r) => s + r.actualTotal, 0),
    error: null,
  }
}
