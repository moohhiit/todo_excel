import { ExtraColumn } from '../types'

interface ColumnPanelProps {
  allCols: string[]
  visibleCols: string[]
  extraCols: ExtraColumn[]
  onToggle: (col: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  onRemoveExtra: (name: string) => void
}

export function ColumnPanel({ allCols, visibleCols, extraCols, onToggle, onSelectAll, onClearAll, onRemoveExtra }: ColumnPanelProps) {
  const getExtra = (col: string) => extraCols.find(c => c.name === col)

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '10px 16px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Visible Columns — {visibleCols.length}/{allCols.length}
        </span>
        <button onClick={onSelectAll} style={{
          marginLeft: 'auto', fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>All Select</button>
        <button onClick={onClearAll} style={{
          fontSize: 11, color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>Clear All</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {allCols.map(col => {
          const active = visibleCols.includes(col)
          const extraDef = getExtra(col)
          const isFormula = extraDef?.type === 'formula'

          return (
            <div key={col} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => onToggle(col)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? 'var(--brand-dim)' : 'var(--bg-surface2)',
                  border: `1px solid ${active ? 'var(--brand-border)' : 'var(--border)'}`,
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                }}
              >
                {isFormula && (
                  <svg width="10" height="10" style={{ flexShrink: 0, color: 'var(--text-formula)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {extraDef && !isFormula && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: 'var(--brand)' }} />
                )}
                {active ? '✓' : '–'} {col}
              </button>
              {extraDef && (
                <button onClick={() => onRemoveExtra(col)} title="Delete column" style={{
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)',
                  borderRadius: 4, padding: 0,
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
