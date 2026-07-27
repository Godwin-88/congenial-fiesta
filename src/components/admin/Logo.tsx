'use client'

export default function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#0066FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', color: 'white', fontSize: 18,
        fontFamily: "'Raleway', sans-serif",
      }}>F</div>
      <span style={{
        fontWeight: 700, fontSize: 16,
        color: 'var(--theme-elevation-800)',
        fontFamily: "'Raleway', sans-serif",
        letterSpacing: '-0.02em',
      }}>
        FweezyTech
        <span style={{ color: '#0066FF' }}> CMS</span>
      </span>
    </div>
  )
}