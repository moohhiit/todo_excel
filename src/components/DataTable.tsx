import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { DataRow, EditCell, ExtraColumn, SortConfig, BADGE_COLORS, evaluateFormula, buildWhatsAppUrl } from '../types'

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
              const isWhatsApp = isDef?.type === 'whatsapp'
              const w = colWidths[col]
              const readOnly = isFormula || isWhatsApp

              return (
                <th
                  key={col}
                  onClick={() => !readOnly && onSort(col)}
                  style={{
                    width: w, minWidth: w,
                    padding: '9px 12px',
                    textAlign: 'left',
                    userSelect: 'none',
                    cursor: readOnly ? 'default' : 'pointer',
                    background: isSort ? 'var(--bg-sort)' : 'var(--bg-surface2)',
                    color: isSort ? 'var(--text-sort)' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 11,
                    position: 'relative',
                    borderRight: '1px solid var(--border-light)',
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isSort && !readOnly)
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
                    {isWhatsApp && (
                      <svg style={{ width: 12, height: 12, flexShrink: 0 }} viewBox="0 0 24 24" fill="#25D366">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    )}
                    {extra && !isFormula && !isWhatsApp && (
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
                    {!readOnly && (
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

                  // WhatsApp column — show clickable button
                  if (extraDef?.type === 'whatsapp' && extraDef.whatsappConfig) {
                    const cfg = extraDef.whatsappConfig
                    const { url, phone, warning } = buildWhatsAppUrl(row, cfg, allHeaders)
                    return (
                      <td key={col} style={{
                        height: ROW_H, width: w,
                        padding: '0 10px',
                        borderRight: '1px solid var(--border-light)',
                      }}>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 7, textDecoration: 'none',
                              background: '#25D366', color: '#fff',
                              fontSize: 11, fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                            title={warning ? `⚠ ${warning}\n+${phone}` : `Send to +${phone}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            {warning ? '⚠ ' : ''}+{phone.slice(-10)}
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>
                        )}
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
