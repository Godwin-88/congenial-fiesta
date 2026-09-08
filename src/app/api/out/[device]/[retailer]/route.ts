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

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function makeFpCookie(value: string): string {
  return `fweezy_fp=${encodeURIComponent(value)}; Path=/; Max-Age=34128000; SameSite=Lax: Secure`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ device: string; retailer: string }> },
) {
  const { device: deviceSlug, retailer } = await params

  const ip =
    _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    _req.headers.get('x-real-ip') ??
    'unknown'
  const { success } = await ratelimit.limit(`out:${ip}`)
  if (!success) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

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

  const cookieHeader = _req.headers.get('cookie') ?? ''
  let fpId = readCookie(cookieHeader, 'fweezy_fp')
  let needsCookie = false
  if (!fpId || !fpId.startsWith('fp_')) {
    fpId = `fp_${crypto.randomUUID()}`
    needsCookie = true
  }

  const linkUrl = new URL(buyLink.url)
  const utmSource = linkUrl.searchParams.get('utm_source')
  const utmMedium = linkUrl.searchParams.get('utm_medium')
  const utmCampaign = linkUrl.searchParams.get('utm_campaign')

  try {
    const supabaseClient = await createSupabaseClient()
    const { data: insertedClick, error: clickError } = await supabaseClient
      .from('affiliate_clicks')
      .insert({
        device_slug: deviceSlug,
        retailer,
        referrer: _req.headers.get('referer') ?? null,
        fp_id: fpId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (clickError) {
      console.error('Affiliate click insert error:', clickError)
    }
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session?.user?.id && insertedClick?.id) {
      await supabaseClient
        .from('affiliate_clicks')
        .update({ user_id: session.user.id })
        .eq('id', insertedClick.id)
    }
  } catch {
    console.error('Affiliate click track failed')
  }

  const res = NextResponse.redirect(buyLink.url, 302)
  if (needsCookie) {
    res.headers.set('Set-Cookie', makeFpCookie(fpId))
  }
  return res
}
