import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { DataRow, EditCell, ExtraColumn, SortConfig, BADGE_COLORS, evaluateFormula } from '../types'

const ROW_H = 38
const OVERSCAN = 15
const MIN_COL_W = 80
const MAX_COL_W = 320

interface DataTableProps {
  rows: DataRow[]
  allHeaders: string[]
  shownCols: string[]
  extraCols: ExtraColumn[]
  editCell: EditCell | null
  editVal: string
  sortConfig: SortConfig
  onStartEdit: (rowId: number, col: string, val: string) => void
  onEditValChange: (val: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onSort: (col: string) => void
}

function measureText(text: string, fontSize = 12, fontWeight = 400): number {
  const avgCharWidth = fontSize * 0.58 * (fontWeight >= 600 ? 1.05 : 1)
  return text.length * avgCharWidth
}

export function DataTable({
  rows, allHeaders, shownCols, extraCols,
  editCell, editVal, sortConfig,
  onStartEdit, onEditValChange, onCommitEdit, onCancelEdit, onSort,
}: DataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(600)
  const [colWidthOverrides, setColWidthOverrides] = useState<Record<string, number>>({})
  const resizeState = useRef<{ col: string; startX: number; startW: number } | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setViewH(entries[0].contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    setScrollTop(scrollRef.current?.scrollTop ?? 0)
  }, [])

  // Virtual window
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const visCount = Math.ceil(viewH / ROW_H) + OVERSCAN * 2
  const endIdx = Math.min(rows.length, startIdx + visCount)
  const visibleRows = rows.slice(startIdx, endIdx)
  const paddingTop = startIdx * ROW_H
  const paddingBottom = Math.max(0, (rows.length - endIdx) * ROW_H)

  const getExtraDef = (col: string) => extraCols.find(c => c.name === col)

  // Auto column widths
  const colWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    const sampleSize = Math.min(rows.length, 80)
    shownCols.forEach(col => {
      if (colWidthOverrides[col] !== undefined) {
        widths[col] = colWidthOverrides[col]
        return
      }
      const extraDef = extraCols.find(c => c.name === col)
      const isFormula = extraDef?.type === 'formula'
      let maxW = measureText(col, 12, 600) + 52
      if (isFormula && extraDef?.formula) {
        maxW += measureText(extraDef.formula.slice(0, 20), 11) + 16
      }
      const sample = rows.slice(0, sampleSize)
      for (const row of sample) {
        let cellVal = ''
        if (isFormula && extraDef?.formula) {
          cellVal = String(evaluateFormula(extraDef.formula, row, allHeaders))
        } else {
          cellVal = String(row[col] ?? '')
        }
        const cellW = measureText(cellVal, 12) + 36
        if (cellW > maxW) maxW = cellW
      }
      widths[col] = Math.min(MAX_COL_W, Math.max(MIN_COL_W, maxW))
    })
    return widths
  }, [shownCols, rows, extraCols, allHeaders, colWidthOverrides])

  // Column resize
  const onResizeMouseDown = useCallback((e: React.MouseEvent, col: string) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidthOverrides[col] ?? colWidths[col] ?? 120
    const onMouseMove = (ev: MouseEvent) => {
      const newW = Math.min(MAX_COL_W, Math.max(MIN_COL_W, startW + (ev.clientX - startX)))
      setColWidthOverrides(prev => ({ ...prev, [col]: newW }))
    }
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [colWidths, colWidthOverrides])

  const totalTableWidth = 48 + shownCols.reduce((a, c) => a + (colWidths[c] ?? 120), 0)

  if (rows.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-faint)', padding: '4rem 0',
      }}>
        <svg width="48" height="48" style={{ marginBottom: 12, opacity: 0.4 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p style={{ fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>Koi data nahi mila</p>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-faint)' }}>Filter ya search change karein</p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="vscroll-container"
      onScroll={onScroll}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        margin: '0 12px 12px',
      }}
    >
      <table
        style={{
          width: totalTableWidth,
          borderCollapse: 'collapse',
          background: 'var(--bg-surface)',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--bg-surface2)', borderBottom: '1px solid var(--border)' }}>
            {/* Row # */}
            <th style={{
              width: 48, minWidth: 48,
              padding: '9px 12px',
              textAlign: 'left',
              color: 'var(--text-faint)',
              fontWeight: 500, fontSize: 11,
              userSelect: 'none',
              borderRight: '1px solid var(--border-light)',
            }}>
              #
            </th>

            {shownCols.map(col => {
              const extra = !!getExtraDef(col)
              const isSort = sortConfig.col === col
              const isDef = getExtraDef(col)
              const isFormula = isDef?.type === 'formula'
              const w = colWidths[col]

              return (
                <th
                  key={col}
                  onClick={() => !isFormula && onSort(col)}
                  style={{
                    width: w, minWidth: w,
                    padding: '9px 12px',
                    textAlign: 'left',
                    userSelect: 'none',
                    cursor: isFormula ? 'default' : 'pointer',
                    background: isSort ? 'var(--bg-sort)' : 'var(--bg-surface2)',
                    color: isSort ? 'var(--text-sort)' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 11,
                    position: 'relative',
                    borderRight: '1px solid var(--border-light)',
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isSort && !isFormula)
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface3)'
                  }}
                  onMouseLeave={e => {
                    if (!isSort)
                      (e.currentTarget as HTMLElement).style.background = isSort ? 'var(--bg-sort)' : 'var(--bg-surface2)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    {isFormula && (
                      <svg style={{ width: 12, height: 12, flexShrink: 0, color: 'var(--text-formula)' }}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {extra && !isFormula && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        flexShrink: 0, background: 'var(--brand)',
                      }} />
                    )}
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      color: isFormula ? 'var(--text-formula)' : isSort ? 'var(--text-sort)' : 'var(--text-secondary)',
                    }}>
                      {col}
                    </span>
                    {!isFormula && (
                      <span style={{
                        fontSize: 10, flexShrink: 0,
                        color: isSort ? 'var(--brand)' : 'var(--border-input)',
                        marginLeft: 2,
                      }}>
                        {isSort ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '⇅'}
                      </span>
                    )}
                    {isFormula && isDef?.formula && (
                      <span style={{
                        fontSize: 10, color: 'var(--text-faint)',
                        overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1,
                      }}>
                        {isDef.formula.slice(0, 20)}
                      </span>
                    )}
                  </span>

                  {/* Resize handle */}
                  <span
                    onMouseDown={e => onResizeMouseDown(e, col)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 6,
                      cursor: 'col-resize', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', zIndex: 1,
                    }}
                    title="Drag to resize"
                  >
                    <span style={{
                      width: 2, height: '55%',
                      background: 'var(--border-input)',
                      borderRadius: 1, opacity: 0.5,
                    }} />
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr style={{ height: paddingTop }}>
              <td colSpan={shownCols.length + 1} />
            </tr>
          )}

          {visibleRows.map((row, ri) => {
            const absIdx = startIdx + ri
            const isEven = absIdx % 2 === 1

            return (
              <tr
                key={row.__id}
                style={{
                  background: isEven ? 'var(--bg-even)' : 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-light)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isEven ? 'var(--bg-even)' : 'var(--bg-surface)'}
              >
                {/* Row number */}
                <td style={{
                  height: ROW_H, width: 48,
                  padding: '0 12px',
                  color: 'var(--text-faint)',
                  userSelect: 'none', fontFamily: 'monospace',
                  textAlign: 'right', fontSize: 11,
                  borderRight: '1px solid var(--border-light)',
                }}>
                  {absIdx + 1}
                </td>

                {shownCols.map(col => {
                  const extraDef = getExtraDef(col)
                  const isFormula = extraDef?.type === 'formula'
                  const isEditing = editCell?.rowId === row.__id && editCell?.col === col
                  const w = colWidths[col]

                  // Formula column — read only
                  if (isFormula) {
                    const fmla = extraDef?.formula ?? ''
                    const computed = fmla ? evaluateFormula(fmla, row, allHeaders) : ''
                    const isErr = String(computed) === '#ERR'
                    return (
                      <td key={col} style={{
                        height: ROW_H, width: w,
                        padding: '0 12px',
                        borderRight: '1px solid var(--border-light)',
                      }}>
                        <span className={isErr ? 'formula-err' : 'formula-cell'}>
                          {isErr ? '⚠ #ERR' : String(computed)}
                        </span>
                      </td>
                    )
                  }

                  const val = String(row[col] ?? '')
                  const badgeClass = extraDef?.options ? BADGE_COLORS[val] : undefined

                  // Editing state
                  if (isEditing) {
                    if (extraDef?.options) {
                      return (
                        <td key={col} style={{ height: ROW_H, width: w, padding: '0 8px', borderRight: '1px solid var(--border-light)' }}>
                          <select autoFocus value={editVal}
                            onChange={e => onEditValChange(e.target.value)}
                            onBlur={onCommitEdit}
                            className="cell-select"
                          >
                            <option value="">-- Select --</option>
                            {extraDef.options.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                      )
                    }
                    return (
                      <td key={col} style={{ height: ROW_H, width: w, padding: '0 8px', borderRight: '1px solid var(--border-light)' }}>
                        <input autoFocus value={editVal}
                          onChange={e => onEditValChange(e.target.value)}
                          onBlur={onCommitEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') onCommitEdit()
                            if (e.key === 'Escape') onCancelEdit()
                          }}
                          className="cell-input"
                        />
                      </td>
                    )
                  }

                  // Normal cell
                  return (
                    <td
                      key={col}
                      style={{ height: ROW_H, width: w, padding: '0 12px', cursor: 'pointer', borderRight: '1px solid var(--border-light)' }}
                      className="group"
                      onClick={() => onStartEdit(row.__id as number, col, val)}
                      title={val}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        {badgeClass ? (
                          <span className={`badge ${badgeClass}`}>{val}</span>
                        ) : (
                          <span style={{
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', color: 'var(--text-primary)',
                            fontSize: 12, flex: 1,
                          }}>
                            {val}
                          </span>
                        )}
                        {/* Edit pencil icon */}
                        <span
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            flexShrink: 0, marginLeft: 'auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 5,
                            background: 'var(--brand-dim)',
                            border: '1px solid var(--brand-border)',
                            transition: 'opacity 0.15s',
                          }}
                        >
                          <svg style={{ width: 11, height: 11, color: 'var(--brand)' }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </span>
                      </span>
                    </td>
                  )
                })}
              </tr>
            )
          })}

          {paddingBottom > 0 && (
            <tr style={{ height: paddingBottom }}>
              <td colSpan={shownCols.length + 1} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
