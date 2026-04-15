import { ExtraColumn } from '../types'

interface FilterBarProps {
  shownCols: string[]
  filters: Record<string, string>
  extraCols: ExtraColumn[]
  getUniqueVals: (col: string) => string[]
  onFilterChange: (col: string, val: string) => void
  onClearFilters: () => void
}

export function FilterBar({ shownCols, filters, extraCols, getUniqueVals, onFilterChange, onClearFilters }: FilterBarProps) {
  const hasActive = Object.values(filters).some(v => v && v !== '__all__')
  const getExtraDef = (col: string) => extraCols.find(c => c.name === col)
  const filterableCols = shownCols.filter(c => getExtraDef(c)?.type !== 'formula')

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '7px 16px',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
      flexShrink: 0,
    }}>
      {/* Filter icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <svg width="13" height="13" style={{ color: 'var(--text-faint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>Filters</span>
      </div>

      {filterableCols.map(col => {
        const extraDef = getExtraDef(col)
        const vals = extraDef?.options || getUniqueVals(col)
        const active = filters[col] && filters[col] !== '__all__'

        return (
          <div key={col} style={{ position: 'relative' }}>
            <select
              value={filters[col] || '__all__'}
              onChange={e => onFilterChange(col, e.target.value)}
              style={{
                paddingLeft: 10, paddingRight: 22, paddingTop: 4, paddingBottom: 4,
                borderRadius: 6, fontSize: 11, cursor: 'pointer',
                outline: 'none', appearance: 'none',
                background: active ? 'var(--brand-dim)' : 'var(--bg-surface2)',
                border: `1px solid ${active ? 'var(--brand-border)' : 'var(--border)'}`,
                color: active ? 'var(--brand)' : 'var(--text-muted)',
                maxWidth: 150,
                transition: 'all 0.15s',
              }}
            >
              <option value="__all__">All — {col}</option>
              {vals.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <svg width="10" height="10" style={{
              pointerEvents: 'none', position: 'absolute', right: 6,
              top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)',
            }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )
      })}

      {hasActive && (
        <button onClick={onClearFilters} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', transition: 'all 0.15s',
        }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear Filters
        </button>
      )}
    </div>
  )
}
