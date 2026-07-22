import { NextResponse } from 'next/server'
import { zipRateLimit } from '@/lib/upstash/ratelimit'

export async function GET(request: Request) {
  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await zipRateLimit.limit(`logos-zip:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    // Fetch logo URLs from Payload
    let logoLight = ''
    let logoDark = ''
    let logoSvgLight = ''
    let logoSvgDark = ''

    try {
      const { getPayload } = await import('payload')
      const config = (await import('@payload-config')).default
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'media-kit',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { active: { equals: true } } as any,
        limit: 1,
        depth: 0,
      })

      if (result.docs.length > 0) {
        const doc = result.docs[0] as Record<string, unknown>
        logoLight = String(doc.logoLight ?? '')
        logoDark = String(doc.logoDark ?? '')
        logoSvgLight = String(doc.logoSvgLight ?? '')
        logoSvgDark = String(doc.logoSvgDark ?? '')
      }
    } catch {
      // Use defaults if fetch fails
    }

    // Download each logo file
    const logoFiles: Array<{ name: string; data: ArrayBuffer | null }> = await Promise.all(
      [
        { name: 'FweezyTech-Logo-Light.png', url: logoLight },
        { name: 'FweezyTech-Logo-Dark.png', url: logoDark },
        { name: 'FweezyTech-Logo-Light.svg', url: logoSvgLight },
        { name: 'FweezyTech-Logo-Dark.svg', url: logoSvgDark },
      ].map(async (file) => {
        if (!file.url) return { name: file.name, data: null }
        try {
          const response = await fetch(file.url, { signal: AbortSignal.timeout(5000) })
          if (!response.ok) return { name: file.name, data: null }
          const data = await response.arrayBuffer()
          return { name: file.name, data }
        } catch {
          return { name: file.name, data: null }
        }
      })
    )

    // Build a zip file using fflate
    const fflate = await import('fflate')

    const zipData = new Map<string, Uint8Array>()

    for (const file of logoFiles) {
      if (file.data) {
        zipData.set(file.name, new Uint8Array(file.data))
      }
    }

    // If no files downloaded, return a simple text notice
    if (zipData.size === 0) {
      const encoder = new TextEncoder()
      zipData.set('README.txt', encoder.encode(
        'No logo files are currently available for download.\n' +
        'Please visit fweezytech.com/press for more information.\n'
      ))
    }

    // Zip the files
    const zipped = fflate.zipSync(Object.fromEntries(zipData), { level: 9 })

    return new NextResponse(zipped, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="FweezyTech-Logos.zip"',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Logos zip error:', error)
    return NextResponse.json({ error: 'Failed to generate zip' }, { status: 500 })
  }
}