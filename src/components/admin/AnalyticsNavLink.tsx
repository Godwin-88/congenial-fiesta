import Link from 'next/link'

/**
 * Custom nav link for the Analytics Dashboard inside Payload's admin sidebar.
 * Renders as an external link pointing to /admin/analytics.
 */
const AnalyticsNavLink = () => {
  return (
    <div style={{ padding: '0 12px', marginTop: '8px' }}>
      <Link
        href="/admin/analytics"
        className="analytics-nav-link"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--theme-elevation-800)',
          textDecoration: 'none',
          transition: 'background 0.15s ease',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
        <span>Analytics</span>
      </Link>
      <style>{`
        .analytics-nav-link:hover {
          background: var(--theme-elevation-100) !important;
        }
      `}</style>
    </div>
  )
}

export default AnalyticsNavLink
