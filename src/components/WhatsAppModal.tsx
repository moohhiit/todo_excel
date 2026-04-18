import { useState, useEffect } from 'react'
import { WhatsAppConfig, DataRow, normalisePhone, buildWhatsAppUrl } from '../types'

interface WhatsAppModalProps {
  headers: string[]
  sampleRow: DataRow | null
  existingNames: string[]
  onAdd: (name: string, config: WhatsAppConfig) => void
  onClose: () => void
}

const COUNTRY_CODES = [
  { code: '91',  label: '🇮🇳 India (+91)' },
  { code: '1',   label: '🇺🇸 USA/Canada (+1)' },
  { code: '44',  label: '🇬🇧 UK (+44)' },
  { code: '971', label: '🇦🇪 UAE (+971)' },
  { code: '92',  label: '🇵🇰 Pakistan (+92)' },
  { code: '880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '94',  label: '🇱🇰 Sri Lanka (+94)' },
  { code: '977', label: '🇳🇵 Nepal (+977)' },
  { code: '60',  label: '🇲🇾 Malaysia (+60)' },
  { code: '65',  label: '🇸🇬 Singapore (+65)' },
  { code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '49',  label: '🇩🇪 Germany (+49)' },
  { code: '61',  label: '🇦🇺 Australia (+61)' },
  { code: '55',  label: '🇧🇷 Brazil (+55)' },
]

export function WhatsAppModal({ headers, sampleRow, existingNames, onAdd, onClose }: WhatsAppModalProps) {
  const [colName, setColName]         = useState('WhatsApp')
  const [phoneCol, setPhoneCol]       = useState(headers[0] ?? '')
  const [message, setMessage]         = useState('Hello {Name}, this is a message for you.')
  const [countryCode, setCountryCode] = useState('91')
  const [preview, setPreview]         = useState<{ url: string; phone: string; warning: string | null } | null>(null)
  const [insertingVar, setInsertingVar] = useState(false)

  const nameConflict = existingNames.includes(colName.trim())

  // Live preview whenever config changes
  useEffect(() => {
    if (!sampleRow || !phoneCol) { setPreview(null); return }
    const config: WhatsAppConfig = { phoneCol, message, defaultCountry: countryCode }
    const result = buildWhatsAppUrl(sampleRow, config, headers)
    setPreview(result)
  }, [phoneCol, message, countryCode, sampleRow, headers])

  const insertPlaceholder = (col: string) => {
    setMessage(prev => prev + `{${col}}`)
    setInsertingVar(false)
  }

  const handleAdd = () => {
    const name = colName.trim()
    if (!name || nameConflict || !phoneCol) return
    onAdd(name, { phoneCol, message, defaultCountry: countryCode })
  }

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '8px 11px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: 9, fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
    ...extra,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--bg-modal)',
        border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {/* WA Icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              WhatsApp Link Column
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Phone number auto-format · Custom message · One-click open
            </p>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface2)', border: '1px solid var(--border)', borderRadius: 7,
            cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
          }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Column name */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
              Column Name
            </label>
            <input type="text" value={colName} onChange={e => setColName(e.target.value)}
              placeholder="e.g. WhatsApp"
              style={inp(nameConflict ? { borderColor: '#f87171' } : {})}
              onFocus={e => (e.target.style.borderColor = '#25D366')}
              onBlur={e => (e.target.style.borderColor = nameConflict ? '#f87171' : 'var(--border-input)')}
            />
            {nameConflict && <p style={{ color: '#f87171', fontSize: 11, margin: '4px 0 0' }}>⚠ Name already exists</p>}
          </div>

          {/* Two-col: phone col + country code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Phone Number Column
              </label>
              <div style={{ position: 'relative' }}>
                <select value={phoneCol} onChange={e => setPhoneCol(e.target.value)}
                  style={{ ...inp(), appearance: 'none', paddingRight: 28, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#25D366')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
                >
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <svg width="10" height="10" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Default Country Code
              </label>
              <div style={{ position: 'relative' }}>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  style={{ ...inp(), appearance: 'none', paddingRight: 28, cursor: 'pointer' }}
                  onFocus={e => (e.target.style.borderColor = '#25D366')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
                >
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <svg width="10" height="10" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Auto-fix info box */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.25)',
            fontSize: 11, color: 'var(--text-muted)',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#25D366' }}>🔧 Auto Phone Fixing</p>
            <p style={{ margin: 0 }}>✓ Extra leading zeros removed &nbsp;·&nbsp; ✓ 00xx prefix stripped</p>
            <p style={{ margin: 0 }}>✓ Local 10-digit → country code added &nbsp;·&nbsp; ✓ All non-digits removed</p>
          </div>

          {/* Message template */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Message Template
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setInsertingVar(v => !v)}
                  style={{
                    fontSize: 11, padding: '2px 9px', borderRadius: 6, cursor: 'pointer',
                    background: insertingVar ? 'rgba(37,211,102,0.15)' : 'var(--bg-surface2)',
                    border: `1px solid ${insertingVar ? '#25D366' : 'var(--border)'}`,
                    color: insertingVar ? '#25D366' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  + Insert Column Value
                </button>
                {insertingVar && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 10,
                    background: 'var(--bg-modal)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: 8, minWidth: 180,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    <p style={{ margin: '0 0 6px 4px', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Click to insert:
                    </p>
                    {headers.map(h => (
                      <button key={h} onClick={() => insertPlaceholder(h)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '5px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        background: 'none', border: 'none',
                        color: 'var(--text-secondary)', transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontFamily: 'monospace', color: '#25D366' }}>{`{${h}}`}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Hello {Name}, aapka order {OrderID} ready hai!"
              style={{
                ...inp(),
                resize: 'vertical', lineHeight: 1.5, minHeight: 90,
              }}
              onFocus={e => (e.target.style.borderColor = '#25D366')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-input)')}
            />
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 0' }}>
              Use <span style={{ fontFamily: 'monospace', color: '#25D366' }}>{'{ColumnName}'}</span> to insert row values
            </p>
          </div>

          {/* Live Preview */}
          {preview && (
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--bg-surface2)', border: '1px solid var(--border)',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Preview (first row)
              </p>

              {/* Phone */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 56, flexShrink: 0 }}>Phone:</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: preview.warning ? '#fbbf24' : '#25D366', fontWeight: 600 }}>
                  +{preview.phone || '—'}
                </span>
                {preview.warning && (
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 999,
                    background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
                    color: '#fbbf24',
                  }}>
                    ⚠ {preview.warning}
                  </span>
                )}
              </div>

              {/* Phone raw from row */}
              {sampleRow && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 56, flexShrink: 0 }}>Raw:</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {String(sampleRow[phoneCol] ?? '—')}
                  </span>
                </div>
              )}

              {/* Message */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', width: 56, flexShrink: 0, paddingTop: 2 }}>Msg:</span>
                <span style={{
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
                  background: 'var(--bg-surface3)', padding: '6px 10px', borderRadius: 8,
                  flex: 1, wordBreak: 'break-word',
                }}>
                  {decodeURIComponent(preview.url.split('&text=')[1] ?? '')}
                </span>
              </div>

              {/* Open link */}
              {preview.url && (
                <a href={preview.url} target="_blank" rel="noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, textDecoration: 'none',
                  background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Test in WhatsApp
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={handleAdd}
            disabled={!colName.trim() || nameConflict || !phoneCol}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
              cursor: (!colName.trim() || nameConflict || !phoneCol) ? 'not-allowed' : 'pointer',
              background: '#25D366', color: '#fff', border: 'none',
              opacity: (!colName.trim() || nameConflict || !phoneCol) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Add WhatsApp Column
          </button>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 12, fontSize: 13, cursor: 'pointer',
            background: 'var(--bg-surface2)', border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
