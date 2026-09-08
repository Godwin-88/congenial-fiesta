import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifySource, classifyDevice } from '@/lib/analytics/tracker'
import { analyticsRateLimit } from '@/lib/upstash/ratelimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function makeFpCookie(value: string): string {
  return `fweezy_fp=${encodeURIComponent(value)}; Path=/; Max-Age=34128000; SameSite=Lax: Secure`
}

function cap(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v)
  return s.slice(0, 500)
}
export async function POST(request: Request) {
  if (!supabase) {
    return new NextResponse(null, { status: 204 })
  }

  const token = process.env.ANALYTICS_BEACON_TOKEN
  if (token) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return new NextResponse(null, { status: 204 })
    }
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  const { success } = await analyticsRateLimit.limit(`track:${ip}`)
  if (!success) {
    return new NextResponse(null, { status: 204 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const path = typeof body.path === 'string' ? body.path : ''
  const referrer = typeof body.referrer === 'string' ? body.referrer : null
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''

  if (!path || !path.startsWith('/') || path.length > 500) {
    return new NextResponse(null, { status: 204 })
  }
  if (
    path.startsWith('/admin') ||
    path.startsWith('/preview') ||
    path.startsWith('/api') ||
    path.startsWith('/_next')
  ) {
    return new NextResponse(null, { status: 204 })
  }

  const parsed = classifySource(referrer)
  const deviceType = classifyDevice(userAgent)
  const countryCode = request.headers.get('x-vercel-ip-country') ?? null

  const cookieHeader = request.headers.get('cookie')
  let fpId = readCookie(cookieHeader, 'fweezy_fp')
  let needsCookie = false
  if (!fpId || !fpId.startsWith('fp_')) {
    fpId = `fp_${crypto.randomUUID()}`
    needsCookie = true
  }

  const utmSource = cap(body.utm_source)
  const utmMedium = cap(body.utm_medium)
  const utmCampaign = cap(body.utm_campaign)

  try {
    const { error } = await supabase
      .from('page_views')
      .insert({
        path,
        referrer,
        source: parsed.source,
        platform: parsed.platform,
        country_code: countryCode,
        device_type: deviceType,
        fp_id: fpId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
    if (error) {
      console.error('Track insert error:', error)
    }
  } catch (e) {
    console.error('Track exception:', e)
  }

  const res = new NextResponse(null, { status: 204 })
  if (needsCookie) {
    res.headers.set('Set-Cookie', makeFpCookie(fpId))
  }
  return res
}