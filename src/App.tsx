import { useState, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { DataRow, EditCell, ExtraColumn, SortConfig, evaluateFormula } from './types'
import { useTheme } from './ThemeContext'
import { UploadScreen } from './components/UploadScreen'
import { ColumnPanel } from './components/ColumnPanel'
import { FilterBar } from './components/FilterBar'
import { DataTable } from './components/DataTable'
import { AddColumnModal } from './components/AddColumnModal'
import { ThemeToggle } from './components/ThemeToggle'

export default function App() {
  const { theme } = useTheme()

  const [data, setData]               = useState<DataRow[]>([])
  const [headers, setHeaders]         = useState<string[]>([])
  const [visibleCols, setVisibleCols] = useState<string[]>([])
  const [extraCols, setExtraCols]     = useState<ExtraColumn[]>([])
  const [filters, setFilters]         = useState<Record<string, string>>({})
  const [fileName, setFileName]       = useState('')
  const [editCell, setEditCell]       = useState<EditCell | null>(null)
  const [editVal, setEditVal]         = useState('')
  const [showColPanel, setShowColPanel]   = useState(false)
  const [showAddExtra, setShowAddExtra]   = useState(false)
  const [sortConfig, setSortConfig]   = useState<SortConfig>({ col: null, dir: 'asc' })
  const [searchGlobal, setSearchGlobal]   = useState('')
  const [savedNotif, setSavedNotif]   = useState(false)
  const [loading, setLoading]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = (file: File) => {
    setFileName(file.name)
    setLoading(true)
    setTimeout(() => {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'array', dense: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number)[][]
          if (raw.length < 2) { setLoading(false); return }
          const hdrs = raw[0].map(String)
          const rows: DataRow[] = raw.slice(1).map((r, i) => {
            const obj: DataRow = { __id: i }
            hdrs.forEach((h, j) => { obj[h] = r[j] !== undefined ? r[j] : '' })
            return obj
          })
          setHeaders(hdrs); setVisibleCols(hdrs); setData(rows)
          setFilters({}); setExtraCols([])
          setSortConfig({ col: null, dir: 'asc' }); setSearchGlobal('')
        } finally { setLoading(false) }
      }
      reader.readAsArrayBuffer(file)
    }, 50)
  }

  const allCols = useMemo(() => [...headers, ...extraCols.map(c => c.name)], [headers, extraCols])

  const filterableCols = useMemo(
    () => allCols.filter(c => !extraCols.find(e => e.name === c && e.type === 'formula')),
    [allCols, extraCols]
  )

  const filteredData = useMemo(() => {
    let rows = data
    if (searchGlobal.trim()) {
      const q = searchGlobal.toLowerCase()
      rows = rows.filter(r => filterableCols.some(c => String(r[c] ?? '').toLowerCase().includes(q)))
    }
    filterableCols.forEach(col => {
      const fv = filters[col]
      if (fv && fv !== '__all__')
        rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(fv.toLowerCase()))
    })
    if (sortConfig.col) {
      const sc = sortConfig.col, dir = sortConfig.dir
      rows = [...rows].sort((a, b) => {
        const va = a[sc] ?? '', vb = b[sc] ?? ''
        if (va < vb) return dir === 'asc' ? -1 : 1
        if (va > vb) return dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return rows
  }, [data, filters, searchGlobal, filterableCols, sortConfig])

  const getUniqueVals = useCallback((col: string) =>
    [...new Set(data.map(r => String(r[col] ?? '')))].filter(Boolean).slice(0, 120), [data])

  const handleSort = useCallback((col: string) =>
    setSortConfig(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }), [])

  const startEdit = useCallback((rowId: number, col: string, val: string) => {
    setEditCell({ rowId, col }); setEditVal(val ?? '')
  }, [])

  const commitEdit = useCallback(() => {
    if (!editCell) return
    setData(prev => prev.map(r => r.__id === editCell.rowId ? { ...r, [editCell.col]: editVal } : r))
    setEditCell(null)
  }, [editCell, editVal])

  const addExtraCol = useCallback((col: ExtraColumn) => {
    setExtraCols(prev => [...prev, col])
    setVisibleCols(prev => [...prev, col.name])
    if (col.type !== 'formula') setData(prev => prev.map(r => ({ ...r, [col.name]: '' })))
    setShowAddExtra(false)
  }, [])

  const removeExtraCol = useCallback((name: string) => {
    setExtraCols(prev => prev.filter(c => c.name !== name))
    setVisibleCols(prev => prev.filter(c => c !== name))
    setData(prev => prev.map(r => { const nr = { ...r }; delete nr[name]; return nr }))
  }, [])

  const downloadExcel = useCallback(() => {
    const exportCols = allCols.filter(c => visibleCols.includes(c))
    const wsData: unknown[][] = [exportCols]
    for (const row of filteredData) {
      wsData.push(exportCols.map(c => {
        const ed = extraCols.find(e => e.name === c)
        if (ed?.type === 'formula' && ed.formula)
          return evaluateFormula(ed.formula, row, headers)
        return row[c] ?? ''
      }))
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, fileName ? `updated_${fileName}` : 'data_export.xlsx')
    setSavedNotif(true); setTimeout(() => setSavedNotif(false), 2500)
  }, [allCols, visibleCols, filteredData, extraCols, headers, fileName])

  const shownCols = useMemo(() => allCols.filter(c => visibleCols.includes(c)), [allCols, visibleCols])
  const activeFilterCount = Object.values(filters).filter(v => v && v !== '__all__').length
  const formulaCount = extraCols.filter(c => c.type === 'formula').length

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--brand)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>File load ho rahi hai...</p>
          <p style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4 }}>Large files ke liye thoda time lag sakta hai</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) return <UploadScreen onFile={loadFile} />

  // ── Header button style helper ───────────────────────────────────────────────
  const btnBase = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 8, fontSize: 12,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-page)' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
        padding: '8px 16px',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border)',
        boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
      }}>

        {/* Logo + file info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto', minWidth: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" style={{ color: '#051405' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={fileName}>
              {fileName}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
              {filteredData.length.toLocaleString()} / {data.length.toLocaleString()} rows
              {formulaCount > 0 && (
                <span style={{ color: 'var(--text-formula)', marginLeft: 8 }}>
                  ƒ {formulaCount}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)', pointerEvents: 'none',
          }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search..." value={searchGlobal}
            onChange={e => setSearchGlobal(e.target.value)}
            style={{
              paddingLeft: 28, paddingRight: 28, paddingTop: 6, paddingBottom: 6,
              borderRadius: 8, fontSize: 12, width: 180,
              background: 'var(--bg-surface2)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          {searchGlobal && (
            <button onClick={() => setSearchGlobal('')} style={{
              position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0,
            }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Columns toggle */}
        <button
          onClick={() => setShowColPanel(v => !v)}
          style={{
            ...btnBase,
            background: showColPanel ? 'var(--brand-dim)' : 'var(--bg-surface2)',
            border: `1px solid ${showColPanel ? 'var(--brand-border)' : 'var(--border)'}`,
            color: showColPanel ? 'var(--brand)' : 'var(--text-muted)',
          }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          Columns
        </button>

        {/* Add Column */}
        <button onClick={() => setShowAddExtra(true)} className="btn-brand"
          style={{ ...btnBase }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Column
        </button>

        {/* Download */}
        <button onClick={downloadExcel} style={{
          ...btnBase,
          background: savedNotif ? 'var(--brand)' : (theme === 'dark' ? '#14532d' : '#dcfce7'),
          border: `1px solid ${savedNotif ? 'var(--brand)' : (theme === 'dark' ? '#166534' : '#bbf7d0')}`,
          color: savedNotif ? '#051405' : (theme === 'dark' ? '#4ade80' : '#15803d'),
          fontWeight: 600,
        }}>
          {savedNotif ? (
            <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>Saved!</>
          ) : (
            <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>Download</>
          )}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* New File */}
        <button onClick={() => fileRef.current?.click()} style={{
          ...btnBase,
          background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m0-8l-4-4m0 0L12 4m0 0v12" />
          </svg>
          New File
        </button>

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = '' }} />
      </header>

      {/* ── Column Panel ──────────────────────────────────────────────────── */}
      {showColPanel && (
        <ColumnPanel
          allCols={allCols} visibleCols={visibleCols} extraCols={extraCols}
          onToggle={col => setVisibleCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
          onSelectAll={() => setVisibleCols(allCols)}
          onClearAll={() => setVisibleCols([])}
          onRemoveExtra={removeExtraCol}
        />
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <FilterBar
        shownCols={shownCols} filters={filters} extraCols={extraCols}
        getUniqueVals={getUniqueVals}
        onFilterChange={(col, val) => setFilters(prev => ({ ...prev, [col]: val }))}
        onClearFilters={() => setFilters({})}
      />

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div style={{
          flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          padding: '5px 16px',
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Active:</span>
          {Object.entries(filters).filter(([, v]) => v && v !== '__all__').map(([col, val]) => (
            <span key={col} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999, fontSize: 11,
              background: 'var(--brand-dim)', border: '1px solid var(--brand-border)',
              color: 'var(--brand)',
            }}>
              <span style={{ opacity: 0.6 }}>{col}:</span> {val}
              <button onClick={() => setFilters(p => ({ ...p, [col]: '__all__' }))} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'inherit', opacity: 0.6, padding: 0, marginLeft: 2, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 12px 0' }}>
        <DataTable
          rows={filteredData} allHeaders={headers} shownCols={shownCols}
          extraCols={extraCols} editCell={editCell} editVal={editVal} sortConfig={sortConfig}
          onStartEdit={startEdit} onEditValChange={setEditVal}
          onCommitEdit={commitEdit} onCancelEdit={() => setEditCell(null)} onSort={handleSort}
        />
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <footer style={{
        flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        padding: '6px 16px',
        background: 'var(--bg-header)', borderTop: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text-faint)',
      }}>
        <span>{filteredData.length.toLocaleString()} rows shown</span>
        <span>·</span>
        <span>{shownCols.length} columns</span>
        {extraCols.length > 0 && (
          <><span>·</span><span style={{ color: 'var(--brand)' }}>
            {extraCols.length} extra ({formulaCount} formula)
          </span></>
        )}
        {activeFilterCount > 0 && (
          <><span>·</span><span style={{ color: 'var(--brand)' }}>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span></>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--border-input)' }}>✏ Cell click = edit · Drag header border = resize</span>
      </footer>

      {/* ── Add Column Modal ─────────────────────────────────────────────── */}
      {showAddExtra && (
        <AddColumnModal
          existingNames={allCols} availableHeaders={headers}
          onAdd={addExtraCol} onClose={() => setShowAddExtra(false)}
        />
      )}
    </div>
  )
}
