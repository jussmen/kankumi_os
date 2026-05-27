export interface ParsedRow {
  transaction_date: string // YYYY-MM-DD
  amount: number
  balance: number | null
  description: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function col(cols: string[], i: number): string {
  return (cols[i] ?? '').trim().replace(/^"|"$/g, '')
}

function parseAmount(raw: string): number {
  return parseInt(raw.replace(/[,¥￥\s]/g, ''), 10) || 0
}

// りそな銀行: Shift-JIS, 3列分割日付, col[0]=レコード区分, col[13]=取引名
export function parseResona(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/)
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseCSVLine(lines[i])
    if (col(cols, 0) !== '明細') continue
    if (col(cols, 13) !== '入金') continue
    const y = col(cols, 14)
    const m = col(cols, 15).padStart(2, '0')
    const d = col(cols, 16).padStart(2, '0')
    if (!y || !m || !d) continue
    const amount = parseAmount(col(cols, 17))
    if (amount <= 0) continue
    rows.push({ transaction_date: `${y}-${m}-${d}`, amount, balance: null, description: col(cols, 19) })
  }
  return rows
}

// みずほ銀行: UTF-8, 可変ヘッダ, col[3]=お預入金額, col[1]=日付(YYYY.MM.DD)
export function parseMizuho(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/)
  const rows: ParsedRow[] = []
  let dataStart = 1
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) { dataStart = i + 2; break }
  }
  for (let i = dataStart; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseCSVLine(lines[i])
    const deposit = col(cols, 3)
    if (!deposit) continue
    const amount = parseAmount(deposit)
    if (amount <= 0) continue
    const rawDate = col(cols, 1).replace(/\./g, '-')
    rows.push({ transaction_date: rawDate, amount, balance: parseAmount(col(cols, 4)) || null, description: col(cols, 5) })
  }
  return rows
}

// 横浜銀行: Shift-JIS, col[2]=お預り金額(¥XXX,XXX), col[0]=日付(YYYY年M月D日)
export function parseYokohamaBank(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/)
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseCSVLine(lines[i])
    const deposit = col(cols, 2)
    if (!deposit) continue
    const dateMatch = col(cols, 0).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (!dateMatch) continue
    const [, y, m, d] = dateMatch
    const amount = parseAmount(deposit)
    if (amount <= 0) continue
    rows.push({ transaction_date: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, amount, balance: null, description: col(cols, 5) })
  }
  return rows
}

function parseWithKey(presetKey: string, text: string): ParsedRow[] {
  switch (presetKey) {
    case 'resona': return parseResona(text)
    case 'mizuho': return parseMizuho(text)
    case 'yokohama-bank': return parseYokohamaBank(text)
    default: throw new Error(`未対応の銀行フォーマット: ${presetKey}`)
  }
}

export function parseByPresetKey(presetKey: string, buffer: ArrayBuffer, encoding: string): ParsedRow[] {
  const encodings = [...new Set([encoding, 'utf-8', 'shift-jis'])]
  for (const enc of encodings) {
    try {
      const text = new TextDecoder(enc).decode(buffer)
      const rows = parseWithKey(presetKey, text)
      if (rows.length > 0) return rows
    } catch {
      // try next encoding
    }
  }
  return parseWithKey(presetKey, new TextDecoder(encoding).decode(buffer))
}
