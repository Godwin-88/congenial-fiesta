import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ytId = searchParams.get('ytId')
  const title = searchParams.get('title') || 'Video'
  const thumbnailUrl = ytId
    ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    : searchParams.get('thumbnailUrl')

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
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              style={{
                width: 1200,
                height: 630,
                objectFit: 'cover',
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: 1200,
                height: 630,
                background: 'linear-gradient(135deg, #1E293B, #0F172A)',
              }}
            />
          )}
        </div>

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
          }}
        />

        {/* Play button */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '24px solid #0066FF',
              borderTop: '16px solid transparent',
              borderBottom: '16px solid transparent',
              marginLeft: 4,
            }}
          />
        </div>

        {/* Bottom content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '32px 48px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#F9FAFB',
              lineHeight: 1.3,
              maxWidth: 800,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#9CA3AF',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            YouTube • FweezyTech
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 32,
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: 1,
          }}
        >
          FWEEZYTECH
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