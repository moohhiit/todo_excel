export interface ExtraColumn {
  name: string
  type: string
  options: string[] | null
  formula?: string | null
  whatsappConfig?: WhatsAppConfig | null
}

export interface DataRow {
  __id: number
  [key: string]: string | number | boolean | null | undefined
}

export interface SortConfig {
  col: string | null
  dir: 'asc' | 'desc'
}

export interface EditCell {
  rowId: number
  col: string
}

export interface WhatsAppConfig {
  phoneCol: string        // which column holds the phone number
  message: string         // message template, can use {ColumnName} placeholders
  defaultCountry: string  // e.g. "91" for India
}

export const EXTRA_COL_TYPES = [
  { id: 'status',    label: 'Status',           options: ['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'] },
  { id: 'priority',  label: 'Priority',         options: ['Low', 'Medium', 'High', 'Critical'] },
  { id: 'remark',    label: 'Remark',           options: null },
  { id: 'assignee',  label: 'Assignee',         options: null },
  { id: 'formula',   label: 'Formula Column',   options: null },
  { id: 'whatsapp',  label: 'WhatsApp Link',    options: null },
  { id: 'custom',    label: 'Custom Column',    options: null },
] as const

// ─── Phone number normaliser ──────────────────────────────────────────────────
// Rules applied in order:
//  1. Strip everything except digits and leading +
//  2. Remove leading 0s after country code (e.g. 0091 → 91, 091 → 91)
//  3. If number starts with 0 and is 10 digits → prepend defaultCountry
//  4. If no country code (≤10 digits) → prepend defaultCountry
//  5. Return digits only (WhatsApp API doesn't want the +)

export function normalisePhone(raw: string, defaultCountry = '91'): { clean: string; warning: string | null } {
  // Remove all non-digit chars except leading +
  let s = String(raw ?? '').trim()
  const hadPlus = s.startsWith('+')
  s = s.replace(/\D/g, '')   // digits only now

  if (!s) return { clean: '', warning: 'Empty phone number' }

  // Strip leading zeros that often come from Excel formatting
  // e.g. 00917012345678 → 917012345678
  if (s.startsWith('00')) s = s.slice(2)

  // If had + and remaining is fine, trust it as international
  // If number starts with 0 (local format like 09876543210), strip the 0
  if (!hadPlus && s.startsWith('0') && s.length <= 11) {
    s = s.slice(1)  // remove leading 0
  }

  // If still looks local (≤10 digits), prepend country code
  if (s.length <= 10) {
    s = defaultCountry + s
  }

  // Sanity check: international numbers are 7–15 digits
  if (s.length < 7 || s.length > 15) {
    return { clean: s, warning: `Unusual length (${s.length} digits)` }
  }

  return { clean: s, warning: null }
}

// Build the wa.me link with an interpolated message
export function buildWhatsAppUrl(
  row: DataRow,
  config: WhatsAppConfig,
  allHeaders: string[]
): { url: string; phone: string; warning: string | null } {
  const rawPhone = String(row[config.phoneCol] ?? '')
  const { clean, warning } = normalisePhone(rawPhone, config.defaultCountry)

  if (!clean) return { url: '', phone: '', warning: 'No phone number' }

  // Replace {ColumnName} placeholders in message
  let msg = config.message
  const allCols = allHeaders
  for (const col of allCols) {
    const escaped = col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    msg = msg.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), String(row[col] ?? ''))
  }

  const url = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(msg)}`
  return { url, phone: clean, warning }
}

export const BADGE_COLORS: Record<string, string> = {
  Done:          'badge-done',
  'In Progress': 'badge-inprogress',
  Pending:       'badge-pending',
  Cancelled:     'badge-cancelled',
  'On Hold':     'badge-onhold',
  High:          'badge-high',
  Critical:      'badge-critical',
  Medium:        'badge-medium',
  Low:           'badge-low',
}

// ─── Formula Engine ───────────────────────────────────────────────────────────
// Supports: =SUM(A,B), =AVG(A,B), =MAX(A,B), =MIN(A,B),
//           =CONCAT(A,B), =IF(cond,"x","y"), =A+B*2, =A/B, =A-B etc.

export function evaluateFormula(
  formula: string,
  row: DataRow,
  headers: string[]
): string | number {
  try {
    if (!formula || !formula.startsWith('=')) return formula ?? ''
    const expr = formula.slice(1).trim()
    const sorted = [...headers].sort((a, b) => b.length - a.length)

    const concatM = expr.match(/^CONCAT\((.+)\)$/i)
    if (concatM) {
      return splitArgs(concatM[1]).map(p => resolveArg(p.trim(), row, sorted)).join('')
    }

    const ifM = expr.match(/^IF\((.+)\)$/i)
    if (ifM) {
      const [cond, tv, fv] = splitArgs(ifM[1])
      const condExpr = replaceColumns(cond.trim(), row, sorted)
      // eslint-disable-next-line no-new-func
      const pass = new Function(`return !!(${condExpr})`)()
      return resolveArg((pass ? tv : fv).trim(), row, sorted)
    }

    const sumM = expr.match(/^SUM\((.+)\)$/i)
    if (sumM) {
      return roundN(splitArgs(sumM[1]).reduce((a, p) => a + (toNum(resolveArg(p.trim(), row, sorted))), 0))
    }

    const avgM = expr.match(/^AVG\((.+)\)$/i)
    if (avgM) {
      const vals = splitArgs(avgM[1]).map(p => toNum(resolveArg(p.trim(), row, sorted)))
      return roundN(vals.reduce((a, b) => a + b, 0) / vals.length)
    }

    const maxM = expr.match(/^MAX\((.+)\)$/i)
    if (maxM) {
      return Math.max(...splitArgs(maxM[1]).map(p => toNum(resolveArg(p.trim(), row, sorted))))
    }

    const minM = expr.match(/^MIN\((.+)\)$/i)
    if (minM) {
      return Math.min(...splitArgs(minM[1]).map(p => toNum(resolveArg(p.trim(), row, sorted))))
    }

    // Generic arithmetic
    const replaced = replaceColumns(expr, row, sorted)
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${replaced})`)()
    return typeof result === 'number' ? roundN(result) : String(result)
  } catch {
    return '#ERR'
  }
}

function splitArgs(str: string): string[] {
  const args: string[] = []
  let depth = 0, cur = ''
  for (const ch of str) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { args.push(cur); cur = '' }
    else cur += ch
  }
  if (cur) args.push(cur)
  return args
}

function resolveArg(arg: string, row: DataRow, sorted: string[]): string | number {
  const unquoted = arg.replace(/^["']|["']$/g, '')
  if (unquoted !== arg) return unquoted
  const num = Number(arg)
  if (!isNaN(num) && arg.trim() !== '') return num
  const matched = sorted.find(h => h.toLowerCase() === arg.toLowerCase())
  if (matched !== undefined) {
    const v = row[matched]
    const n = parseFloat(String(v ?? ''))
    return isNaN(n) ? String(v ?? '') : n
  }
  return arg
}

function replaceColumns(expr: string, row: DataRow, sorted: string[]): string {
  let result = expr
  for (const h of sorted) {
    const esc = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?<![\\w"'])${esc}(?![\\w"'])`, 'gi')
    const v = row[h]
    const n = parseFloat(String(v ?? ''))
    result = result.replace(re, isNaN(n) ? `"${String(v ?? '')}"` : String(n))
  }
  return result
}

function toNum(v: string | number): number {
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

function roundN(n: number): number {
  return Math.round(n * 1e10) / 1e10
}
