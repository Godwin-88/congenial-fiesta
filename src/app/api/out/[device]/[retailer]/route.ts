import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { redis } from '@/lib/upstash/redis'
import { outboundRateLimit as ratelimit } from '@/lib/upstash/ratelimit'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

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
  const supabase = getAdminSupabase()

  const cacheKey = `devices:slug:${deviceSlug}`
  let deviceId: string = ''
  const cached = await redis.get(cacheKey)
  if (cached) {
    deviceId = cached as string
  } else {
    const { data: devices } = await supabase
      .from('devices')
      .select('id')
      .eq('slug', deviceSlug)
      .eq('status', 'published')
      .limit(1)

    if (!devices || devices.length === 0) {
      return NextResponse.redirect(new URL('/', _req.url), 302)
    }
    deviceId = String(devices[0].id)
    await redis.setex(cacheKey, 600, deviceId)
  }

  // Get the device with buy links
  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .single()

  if (!device) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  const buyLinks = (device.buy_links as Array<{ retailer: string; url: string }>) ?? []
  const buyLink = buyLinks.find((l) => l.retailer === retailer)

  if (!buyLink || !buyLink.url) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  // Log click to Supabase
  try {
    const supabaseClient = await createSupabaseClient()
    const { data: insertedClick } = await supabaseClient
      .from('affiliate_clicks')
      .insert({
        device_slug: deviceSlug,
        retailer,
        referrer: _req.headers.get('referer') ?? null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session?.user?.id && insertedClick?.id) {
      await supabaseClient
        .from('affiliate_clicks')
        .update({ user_id: session.user.id })
        .eq('id', insertedClick.id)
    }
  } catch {
    // Log failure silently — don't block the redirect
  }

  return NextResponse.redirect(buyLink.url, 302)
}