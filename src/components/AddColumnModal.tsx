import { useState } from 'react'
import { EXTRA_COL_TYPES, ExtraColumn } from '../types'

interface AddColumnModalProps {
  existingNames: string[]
  availableHeaders: string[]
  onAdd: (col: ExtraColumn) => void
  onClose: () => void
}

const FORMULA_EXAMPLES = [
  { label: 'Sum cols',     value: '=SUM(ColA, ColB)' },
  { label: 'Multiply',     value: '=Price * Qty' },
  { label: 'Average',      value: '=AVG(Score1, Score2)' },
  { label: 'IF condition', value: '=IF(Amount>1000,"High","Low")' },
  { label: 'Concat',       value: '=CONCAT(First, Last)' },
  { label: 'Percentage',   value: '=Price * Disc / 100' },
]

export function AddColumnModal({ existingNames, availableHeaders, onAdd, onClose }: AddColumnModalProps) {
  const [colType, setColType] = useState('status')
  const [colName, setColName] = useState('Status')
  const [customOpts, setCustomOpts] = useState('')
  const [formula, setFormula] = useState('')
  const [fErr, setFErr] = useState('')

  const handleTypeChange = (id: string) => {
    setColType(id)
    const def = EXTRA_COL_TYPES.find(t => t.id === id)
    setColName(def?.label || 'New Column')
    setFErr('')
  }

  const handleAdd = () => {
    const name = colName.trim()
    if (!name || existingNames.includes(name)) return
    if (colType === 'formula') {
      if (!formula.trim()) { setFErr('Formula required'); return }
      if (!formula.startsWith('=')) { setFErr('Formula must start with ='); return }
      onAdd({ name, type: 'formula', options: null, formula })
      return
    }
    const def = EXTRA_COL_TYPES.find(t => t.id === colType)
    let options = def?.options ? [...def.options] as string[] : null
    if (colType === 'custom' && customOpts.trim()) {
      options = customOpts.split(',').map(s => s.trim()).filter(Boolean)
    }
    onAdd({ name, type: colType, options: options ?? null })
  }

  const nameConflict = existingNames.includes(colName.trim())
  const selectedDef = EXTRA_COL_TYPES.find(t => t.id === colType)

  const inputStyle = (hasError?: boolean) => ({
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-input)',
    border: `1px solid ${hasError ? '#f87171' : 'var(--border-input)'}`,
    borderRadius: 10, fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-modal)',
        border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
               Add Column
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Status, Formula, Custom - Available
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface2)', border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Type grid */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Column Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {EXTRA_COL_TYPES.map(t => {
                const active = colType === t.id
                return (
                  <button key={t.id} onClick={() => handleTypeChange(t.id)} style={{
                    padding: '10px 8px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                    background: active ? 'var(--brand-dim)' : 'var(--bg-surface2)',
                    border: `1px solid ${active ? 'var(--brand-border)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--brand)' : 'var(--text-secondary)', marginBottom: 2 }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.id === 'formula' ? 'Computed' : t.options ? t.options.slice(0, 2).join(', ') + '…' : 'Free text'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Column name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
              Column Name
            </label>
            <input
              type="text"
              value={colName}
              onChange={e => setColName(e.target.value)}
              placeholder="e.g. Total Amount"
              style={inputStyle(nameConflict)}
              onFocus={e => !nameConflict && (e.target.style.borderColor = 'var(--brand)')}
              onBlur={e => (e.target.style.borderColor = nameConflict ? '#f87171' : 'var(--border-input)')}
            />
            {nameConflict && (
              <p style={{ color: '#f87171', fontSize: 11, margin: '4px 0 0' }}>⚠ Yeh naam already exist karta hai</p>
            )}
          </div>

          {/* Formula */}
          {colType === 'formula' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Formula
                </label>
                {availableHeaders.length > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    Cols: {availableHeaders.slice(0, 5).join(', ')}{availableHeaders.length > 5 ? '…' : ''}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formula}
                onChange={e => { setFormula(e.target.value); setFErr('') }}
                placeholder="=Price * Qty  or  =SUM(A, B)"
                style={{
                  ...inputStyle(!!fErr),
                  fontFamily: "'SF Mono','Fira Code',monospace",
                  color: 'var(--brand)',
                  background: 'var(--bg-surface2)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                onBlur={e => (e.target.style.borderColor = fErr ? '#f87171' : 'var(--border-input)')}
              />
              {fErr && <p style={{ color: '#f87171', fontSize: 11, margin: '4px 0 0' }}>⚠ {fErr}</p>}

              {/* Quick examples */}
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '0 0 6px' }}>Quick examples:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FORMULA_EXAMPLES.map(ex => (
                    <button key={ex.value} onClick={() => setFormula(ex.value)} style={{
                      padding: '3px 8px', borderRadius: 6,
                      background: 'var(--bg-surface2)', border: '1px solid var(--border)',
                      fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer',
                      fontFamily: "monospace", transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-border)'; e.currentTarget.style.color = 'var(--brand)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supported reference */}
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 10,
                background: 'var(--bg-surface2)', border: '1px solid var(--border)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px' }}>Supported:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {[
                    '=SUM(A, B)', '=AVG(A, B)',
                    '=MAX(A, B)', '=MIN(A, B)',
                    '=CONCAT(A, B)', '=IF(A>10,"Y","N")',
                    '=A * B + C', '=A / B * 100',
                  ].map(f => (
                    <span key={f} style={{ fontSize: 10, color: 'var(--brand)', fontFamily: 'monospace' }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom options */}
          {colType === 'custom' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Dropdown Options <span style={{ fontWeight: 400, textTransform: 'none' }}>(comma separated, optional)</span>
              </label>
              <input
                type="text" value={customOpts}
                onChange={e => setCustomOpts(e.target.value)}
                placeholder="Option A, Option B, Option C"
                style={inputStyle()}
                onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
              />
            </div>
          )}

          {/* Preset preview */}
          {selectedDef && 'options' in selectedDef && selectedDef.options && colType !== 'custom' && colType !== 'formula' && (
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-surface2)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>Available options:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(selectedDef.options as readonly string[]).map(o => (
                  <span key={o} style={{
                    padding: '2px 10px', borderRadius: 999,
                    background: 'var(--bg-surface3)', border: '1px solid var(--border)',
                    fontSize: 11, color: 'var(--text-secondary)',
                  }}>{o}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 22px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={handleAdd}
            disabled={!colName.trim() || nameConflict}
            className="btn-brand"
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13,
              opacity: (!colName.trim() || nameConflict) ? 0.4 : 1,
              cursor: (!colName.trim() || nameConflict) ? 'not-allowed' : 'pointer',
            }}
          >
            Add Column 
          </button>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
            background: 'var(--bg-surface2)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', transition: 'all 0.15s',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
