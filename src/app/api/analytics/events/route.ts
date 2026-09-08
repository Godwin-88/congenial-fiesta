import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyticsRateLimit } from '@/lib/upstash/ratelimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

const ACTIONS = new Set(['save', 'add_to_compare', 'watch', 'related_click'])

const CONTENT_TYPES = new Set(['device', 'article', 'video', 'comparison'])
const MAX_LEN = 500

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function clamp(v: unknown, max: number): string | null {
  if (v === null || v === undefined) return null
    const s = String(v)
    return s.slice(0,max)
}
function makeFpCookie(value: string): string {
  return `fweezy_fp=${encodeURIComponent(value)}; Path=/; Max-Age=34128000; SameSite=Lax: Secure`
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
  const { success } = await analyticsRateLimit.limit(`events:${ip}`)
  if (!success) {
    return new NextResponse(null, { status: 204 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const action = String(body.action ?? '').slice(0, MAX_LEN)
  if (!ACTIONS.has(action)) {
    return new NextResponse(null, { status: 204 })
  }

  const content_type = clamp(body.content_type, MAX_LEN)
  if (content_type && !CONTENT_TYPES.has(content_type)) {

    return new NextResponse(null, { status: 204 })
  }

	 const content_id = clamp(body.content_id, MAX_LEN)
	 const device_slug = clamp(body.device_slug, MAX_LEN)
	 const referrer = clamp(body.referrer, MAX_LEN)

	 const cookieHeader = request.headers.get('cookie')
	 let fpId = readCookie(cookieHeader, 'fweezy_fp')
	 let needsCookie = false
	 if (!fpId || !fpId.startsWith('fp_')) {
    fpId = `fp_${crypto.randomUUID()}`
    needsCookie = true
	 }

	 const utm_source = clamp(body.utm_source, MAX_LEN)
	 const utm_medium = clamp(body.utm_medium, MAX_LEN)
	 const utm_campaign = clamp(body.utm_campaign, MAX_LEN)

	 try {
    await supabase.from('interactions').insert({
      action,
      content_type: content_type || 'device',
      content_id,
      device_slug,
      fp_id: fpId,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
    })
	 } catch (e) {
    console.error('Interaction insert error:', e)
	 }

	 const res = new NextResponse(null, { status: 204 })
	 if (needsCookie) {
    res.headers.set('Set-Cookie', makeFpCookie(fpId))
	 }
	 return res
}
