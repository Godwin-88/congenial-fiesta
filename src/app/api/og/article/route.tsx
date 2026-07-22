import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const title = searchParams.get('title') || slug?.replace(/-/g, ' ') || 'Article'
  const category = searchParams.get('category') || 'Article'

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#111827',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          fontFamily: '"Inter", sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Dark overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(17,24,39,0.3), rgba(17,24,39,0.92))',
          }}
        />

        {/* FweezyTech wordmark top-right */}
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

        {/* Content */}
        <div
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
          }}
        >
          {/* Category badge */}
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              background: '#0066FF',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              width: 'fit-content',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {category}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: '#F9FAFB',
              lineHeight: 1.2,
              maxWidth: 800,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>

          {/* Brand */}
          <div
            style={{
              fontSize: 14,
              color: '#9CA3AF',
              marginTop: 8,
            }}
          >
            fweezytech.com
          </div>
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