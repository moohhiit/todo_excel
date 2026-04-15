export interface ExtraColumn {
  name: string
  type: string
  options: string[] | null
  formula?: string | null
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

export const EXTRA_COL_TYPES = [
  { id: 'status',  label: 'Status',         options: ['Pending', 'In Progress', 'Done', 'Cancelled', 'On Hold'] },
  { id: 'priority',label: 'Priority',       options: ['Low', 'Medium', 'High', 'Critical'] },
  { id: 'remark',  label: 'Remark',         options: null },
  { id: 'assignee',label: 'Assignee',       options: null },
  { id: 'formula', label: 'Formula Column', options: null },
  { id: 'custom',  label: 'Custom Column',  options: null },
] as const

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
