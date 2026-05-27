import type { SupabaseClient } from '@supabase/supabase-js'

const ZENKAKU_MAP: Record<string, string> = {
  'ア':'ｱ','イ':'ｲ','ウ':'ｳ','エ':'ｴ','オ':'ｵ',
  'カ':'ｶ','キ':'ｷ','ク':'ｸ','ケ':'ｹ','コ':'ｺ',
  'サ':'ｻ','シ':'ｼ','ス':'ｽ','セ':'ｾ','ソ':'ｿ',
  'タ':'ﾀ','チ':'ﾁ','ツ':'ﾂ','テ':'ﾃ','ト':'ﾄ',
  'ナ':'ﾅ','ニ':'ﾆ','ヌ':'ﾇ','ネ':'ﾈ','ノ':'ﾉ',
  'ハ':'ﾊ','ヒ':'ﾋ','フ':'ﾌ','ヘ':'ﾍ','ホ':'ﾎ',
  'マ':'ﾏ','ミ':'ﾐ','ム':'ﾑ','メ':'ﾒ','モ':'ﾓ',
  'ヤ':'ﾔ','ユ':'ﾕ','ヨ':'ﾖ',
  'ラ':'ﾗ','リ':'ﾘ','ル':'ﾙ','レ':'ﾚ','ロ':'ﾛ',
  'ワ':'ﾜ','ヲ':'ｦ','ン':'ﾝ',
  'ァ':'ｧ','ィ':'ｨ','ゥ':'ｩ','ェ':'ｪ','ォ':'ｫ',
  'ッ':'ｯ','ャ':'ｬ','ュ':'ｭ','ョ':'ｮ',
  'ガ':'ｶﾞ','ギ':'ｷﾞ','グ':'ｸﾞ','ゲ':'ｹﾞ','ゴ':'ｺﾞ',
  'ザ':'ｻﾞ','ジ':'ｼﾞ','ズ':'ｽﾞ','ゼ':'ｾﾞ','ゾ':'ｿﾞ',
  'ダ':'ﾀﾞ','ヂ':'ﾁﾞ','ヅ':'ﾂﾞ','デ':'ﾃﾞ','ド':'ﾄﾞ',
  'バ':'ﾊﾞ','ビ':'ﾋﾞ','ブ':'ﾌﾞ','ベ':'ﾍﾞ','ボ':'ﾎﾞ',
  'パ':'ﾊﾟ','ピ':'ﾋﾟ','プ':'ﾌﾟ','ペ':'ﾍﾟ','ポ':'ﾎﾟ',
  'ヴ':'ｳﾞ','ー':'ｰ','　':' ',
}

export function toHalfWidthKana(str: string): string {
  return str.split('').map(c => ZENKAKU_MAP[c] ?? c).join('')
}

export function normalizeForMatch(str: string): string {
  return toHalfWidthKana(str)
    .replace(/^振込\s*/u, '')
    .replace(/[　\s]+/g, ' ')
    .trim()
    .toUpperCase()
}

export async function runAutoMatching(
  supabase: SupabaseClient,
  orgId: string,
  importId: string
): Promise<{ matched: number; unmatched: number }> {
  const [
    { data: transactions },
    { data: profiles },
    { data: charges },
    { data: existingRecords },
  ] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id, transaction_date, amount, description')
      .eq('bank_import_id', importId)
      .eq('status', 'unmatched'),
    supabase
      .from('payment_profiles')
      .select('unit_id, transfer_name, source')
      .eq('organization_id', orgId)
      .is('effective_to', null),
    supabase
      .from('unit_charges')
      .select('unit_id, amount')
      .eq('organization_id', orgId)
      .is('effective_to', null)
      .eq('is_not_applicable', false),
    supabase
      .from('payment_records')
      .select('unit_id, year_month')
      .eq('organization_id', orgId),
  ])

  // 振込名義 → unit_id のマップ（adminプロフィールがuserより優先）
  const adminUnits = new Set((profiles ?? []).filter(p => p.source === 'admin').map(p => p.unit_id))
  const profileMap = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.source === 'user' && adminUnits.has(p.unit_id)) continue
    profileMap.set(normalizeForMatch(p.transfer_name), p.unit_id)
  }

  // unit_id → 月次請求合計
  const chargeMap = new Map<string, number>()
  for (const c of charges ?? []) {
    chargeMap.set(c.unit_id, (chargeMap.get(c.unit_id) ?? 0) + Number(c.amount))
  }

  // 既存 PaymentRecord の unit+month セット
  const existingSet = new Set((existingRecords ?? []).map(r => `${r.unit_id}:${r.year_month}`))

  let matched = 0
  let unmatched = 0

  for (const tx of transactions ?? []) {
    const normDesc = normalizeForMatch(tx.description)

    let matchedUnitId: string | null = null
    if (profileMap.has(normDesc)) {
      matchedUnitId = profileMap.get(normDesc)!
    } else {
      for (const [norm, unitId] of profileMap) {
        if (normDesc.startsWith(norm) || norm.startsWith(normDesc)) {
          matchedUnitId = unitId
          break
        }
      }
    }

    if (!matchedUnitId) { unmatched++; continue }

    const yearMonth = tx.transaction_date.slice(0, 7)
    if (existingSet.has(`${matchedUnitId}:${yearMonth}`)) { unmatched++; continue }

    const expected = chargeMap.get(matchedUnitId) ?? 0
    const payStatus = expected > 0 && Math.abs(Number(tx.amount) - expected) < 1 ? 'confirmed' : 'irregular'

    const { data: record } = await supabase
      .from('payment_records')
      .insert({
        organization_id: orgId,
        unit_id: matchedUnitId,
        year_month: yearMonth,
        paid_amount: tx.amount,
        status: payStatus,
        bank_transaction_id: tx.id,
        has_irregularity_flag: payStatus === 'irregular',
      })
      .select('id')
      .single()

    if (!record) { unmatched++; continue }

    await supabase
      .from('bank_transactions')
      .update({ status: 'matched', matched_payment_id: record.id })
      .eq('id', tx.id)

    existingSet.add(`${matchedUnitId}:${yearMonth}`)
    matched++
  }

  await supabase
    .from('bank_imports')
    .update({ matched_count: matched, unmatched_count: unmatched })
    .eq('id', importId)

  return { matched, unmatched }
}
