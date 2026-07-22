import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifySource, classifyDevice } from '@/lib/analytics/tracker'
import { analyticsRateLimit } from '@/lib/upstash/ratelimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function POST(request: Request) {
  // If analytics not configured, silently drop
  if (!supabase || !process.env.ANALYTICS_BEACON_TOKEN) {
    return new NextResponse(null, { status: 204 })
  }

  // Check beacon token — silently drop if invalid (return 204)
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.ANALYTICS_BEACON_TOKEN}`) {
    return new NextResponse(null, { status: 204 })
  }

  // Rate limit: generous — page navigation
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await analyticsRateLimit.limit(`track:${ip}`)
  if (!success) {
    return new NextResponse(null, { status: 204 })
  }

  let body: { path?: string; referrer?: string; userAgent?: string }
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const { path, referrer, userAgent } = body

  // Validate path
  if (!path || typeof path !== 'string' || !path.startsWith('/') || path.length > 500) {
    return new NextResponse(null, { status: 204 })
  }

  // Classify source and device
  const { source, platform } = classifySource(referrer ?? null)
  const deviceType = classifyDevice(userAgent ?? '')
  const countryCode = request.headers.get('x-vercel-ip-country') ?? null

  // Insert into Supabase
  try {
    const { error } = await supabase
      .from('page_views')
      .insert({
        path,
        referrer: referrer ?? null,
        source,
        platform,
        country_code: countryCode,
        device_type: deviceType,
      })

    if (error) {
      console.error('Track insert error:', error)
    }
  } catch (e) {
    console.error('Track exception:', e)
  }

  return new NextResponse(null, { status: 204 })
}