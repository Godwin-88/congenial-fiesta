import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const brand = searchParams.get('brand')
  const deviceName = searchParams.get('name') || slug?.replace(/-/g, ' ') || 'Device'
  const brandName = searchParams.get('brandName') || brand || 'Brand'
  const score = searchParams.get('score')

  try {
    // Try to fetch device data from payload for richer OG image
    if (slug && brand && process.env.NEXT_PUBLIC_SERVER_URL) {
      const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/devices?where[slug][equals]=${slug}&depth=1`
      const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${process.env.PAYLOAD_SECRET}` },
        next: { revalidate: 3600 },
      }).catch(() => null)

      if (res?.ok) {
        const data = await res.json()
        const device = data.docs?.[0]
        if (device) {
          // We have device data — redirecting to render with full data
          // For now, use the basic params passed in
        }
      }
    }
  } catch {
    // Fallback to basic render
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#111827',
          display: 'flex',
          fontFamily: '"Inter", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Left half: device placeholder */}
        <div
          style={{
            width: 600,
            height: 630,
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 280,
              height: 500,
              borderRadius: 32,
              background: 'linear-gradient(180deg, #334155, #1E293B)',
              border: '2px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#475569',
            }}
          >
            Device Image
          </div>
        </div>

        {/* Right half */}
        <div
          style={{
            width: 600,
            height: 630,
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* FweezyTech wordmark */}
          <div
            style={{
              position: 'absolute',
              top: 32,
              right: 48,
              fontSize: 14,
              fontWeight: 700,
              color: '#0066FF',
              letterSpacing: 1,
            }}
          >
            FWEEZYTECH
          </div>

          {/* Brand name */}
          <div
            style={{
              fontSize: 18,
              color: '#9CA3AF',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            {brandName}
          </div>

          {/* Device name */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#F9FAFB',
              lineHeight: 1.2,
              marginBottom: 24,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {deviceName}
          </div>

          {/* Score */}
          {score && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#0066FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {score}
              </div>
              <div style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 500 }}>
                Fweezy Score
              </div>
            </div>
          )}

          {/* Sub-score pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 20,
              flexWrap: 'wrap',
            }}
          >
            {['Display', 'Perf', 'Camera', 'Battery', 'Value'].map((label) => (
              <div
                key={label}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  fontSize: 12,
                  color: '#D1D5DB',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Domain */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              right: 48,
              fontSize: 12,
              color: '#4B5563',
            }}
          >
            fweezytech.com
          </div>
        </div>

        {/* Bottom accent stripe */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#F59E0B',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
  )
}