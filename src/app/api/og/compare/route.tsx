import { ImageResponse } from 'next/og'
import { getDeviceBySlug } from '@/lib/devices/queries'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const devicesParam = searchParams.get('devices')
  if (!devicesParam) {
    return new Response('Missing devices param', { status: 400 })
  }

  const slugs = devicesParam.split(',').filter(Boolean).slice(0, 3)
  const devices = await Promise.all(slugs.map((slug) => getDeviceBySlug(slug)))
  const validDevices = devices.filter((d): d is NonNullable<typeof d> => d !== null)

  if (validDevices.length < 2) {
    return new Response('Not enough devices', { status: 400 })
  }

  const width = 1200
  const height = 630
  const primaryColor = '#0066FF'

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#111827',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: primaryColor }}>FweezyTech</div>
          <div style={{ fontSize: '20px', color: '#9CA3AF' }}>Compare</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
          {validDevices.slice(0, 2).map((device, idx) => {
            const primary = device.images?.find((img) => img.isPrimary)
            return (
              <div key={device.slug} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '16px',
                    border: `2px solid ${primaryColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1F2937',
                    marginBottom: '24px',
                    overflow: 'hidden',
                  }}
                >
                  {primary ? (
                    <img
                      src={primary.url}
                      alt={device.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '24px' }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px', color: '#6B7280' }}>📱</div>
                  )}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
                  {device.name}
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 24px',
                    borderRadius: '9999px',
                    backgroundColor: primaryColor,
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: 'bold',
                  }}
                >
                  {device.scores?.overall ?? 0}/100
                </div>
              </div>
            )
          })}

          {validDevices.length >= 2 && (
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: primaryColor,
                alignSelf: 'center',
              }}
            >
              vs
            </div>
          )}

          {validDevices.length === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {(() => {
                const device = validDevices[2]
                const primary = device.images?.find((img) => img.isPrimary)
                return (
                  <>
                    <div
                      style={{
                        width: '160px',
                        height: '160px',
                        borderRadius: '12px',
                        border: `2px solid ${primaryColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1F2937',
                        marginBottom: '16px',
                        overflow: 'hidden',
                      }}
                    >
                      {primary ? (
                        <img
                          src={primary.url}
                          alt={device.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '16px' }}
                        />
                      ) : (
                        <div style={{ fontSize: '36px', color: '#6B7280' }}>📱</div>
                      )}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
                      {device.name}
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        backgroundColor: primaryColor,
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: 'bold',
                      }}
                    >
                      {device.scores?.overall ?? 0}/100
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            backgroundColor: primaryColor,
          }}
        />
      </div>
    ),
    { width, height },
  )
}
