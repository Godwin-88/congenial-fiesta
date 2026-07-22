import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#111827',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)',
          }}
        />

        {/* Brand accent stripe at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#0066FF',
          }}
        />

        {/* Logo F */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            background: '#0066FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
            fontWeight: 900,
            color: 'white',
            marginBottom: 24,
          }}
        >
          F
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#F9FAFB',
            letterSpacing: -1,
            marginBottom: 8,
          }}
        >
          FweezyTech
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            color: '#9CA3AF',
            letterSpacing: 0.3,
          }}
        >
          Kenya's #1 Tech Review Destination
        </div>

        {/* Page title */}
        {title && (
          <div
            style={{
              fontSize: 28,
              color: '#F59E0B',
              marginTop: 24,
              fontWeight: 700,
            }}
          >
            {title.replace(/\+/g, ' ')}
          </div>
        )}

        {/* Social icons row */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 40,
            fontSize: 28,
            color: '#6B7280',
          }}
        >
          <span>YouTube</span>
          <span>TikTok</span>
          <span>Instagram</span>
          <span>Facebook</span>
        </div>
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