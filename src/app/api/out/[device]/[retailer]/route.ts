import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { redis, getRedisOrThrow } from '@/lib/upstash/redis'
import { outboundRateLimit as ratelimit } from '@/lib/upstash/ratelimit'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ device: string; retailer: string }> },
) {
  const { device: deviceSlug, retailer } = await params

  // Rate limit
  const ip =
    _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    _req.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await ratelimit.limit(`out:${ip}`)
  if (!success) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  // Look up the device
  const payload = await getPayload({ config })

  const cacheKey = `devices:slug:${deviceSlug}`
  let deviceId: string = ''
  const cached = await redis.get(cacheKey)
  if (cached) {
    deviceId = cached as string
  } else {
    const devices = await payload.find({
      collection: 'devices',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { slug: { equals: deviceSlug }, status: { equals: 'published' } } as any,
      limit: 1,
      depth: 0,
    })
    if (devices.docs.length === 0) {
      return NextResponse.redirect(new URL('/', _req.url), 302)
    }
    deviceId = String(devices.docs[0].id)
    await redis.setex(cacheKey, 600, deviceId)
  }

  // Get the device with buy links
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const device = (await payload.findByID({
    collection: 'devices',
    id: deviceId,
    depth: 0,
  })) as Record<string, unknown> | null

  if (!device) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  const buyLinks = (device.buyLinks as Array<{ retailer: string; url: string }>) ?? []
  const buyLink = buyLinks.find((l) => l.retailer === retailer)

  if (!buyLink || !buyLink.url) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  // Log click to Supabase
  try {
    const supabase = await createClient()
    await supabase.from('affiliate_clicks').insert({
      device_slug: deviceSlug,
      retailer,
      referrer: _req.headers.get('referer') ?? null,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Log failure silently — don't block the redirect
  }

  return NextResponse.redirect(buyLink.url, 302)
}