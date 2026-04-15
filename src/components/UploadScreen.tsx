import { useRef } from 'react'
import { ThemeToggle } from './ThemeToggle'

interface UploadScreenProps { onFile: (file: File) => void }

export function UploadScreen({ onFile }: UploadScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
    }}>
      {/* Theme toggle top-right */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>

        {/* Icon */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 22,
            background: 'var(--brand-dim)',
            border: '1px solid var(--brand-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="44" height="44" style={{ color: 'var(--brand)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: -0.5 }}>
            Excel Data Manager
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            10,000+ rows · Virtual Scroll · Formula Engine · Light & Dark Mode
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {['⚡ 10k+ Rows', '🔢 Formulas', '🎯 Column Filters', '✏️ Live Edit', '↔ Resizable Cols', '📥 Excel Export'].map(f => (
            <span key={f} style={{
              padding: '4px 12px', borderRadius: 999,
              background: 'var(--bg-surface2)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-muted)',
            }}>{f}</span>
          ))}
        </div>

        {/* Drop zone */}
        <div
          style={{
            border: '2px dashed var(--brand-border)',
            borderRadius: 16,
            padding: '48px 24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: 'var(--bg-surface)',
          }}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => {
            e.preventDefault()
            e.currentTarget.style.borderColor = 'var(--brand)'
            e.currentTarget.style.background = 'var(--brand-dim)'
          }}
          onDragLeave={e => {
            e.currentTarget.style.borderColor = 'var(--brand-border)'
            e.currentTarget.style.background = 'var(--bg-surface)'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-dim)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
        >
          <svg width="52" height="52" style={{ color: 'var(--brand)', margin: '0 auto 12px', display: 'block', opacity: 0.8 }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            File yahan drop karein
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
            ya click karke browse karein
          </p>
          <button className="btn-brand" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13 }}>
            File Choose Karein
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 16, marginBottom: 0 }}>
            .xlsx · .xls · .csv
          </p>
        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />

        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 16 }}>
          🔒 File sirf browser mein process hoti hai
        </p>
      </div>
    </div>
  )
}
