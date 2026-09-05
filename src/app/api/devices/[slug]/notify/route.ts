import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  analytics: true,
})

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`device-notify:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = getAdminSupabase()

    const { data: device } = await supabase
      .from('devices')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    const { error: insertError } = await supabase
      .from('device_watchers')
      .upsert(
        { device_id: device.id, email },
        { onConflict: 'device_id,email' },
      )

    if (insertError) {
      console.error('device notify upsert error:', insertError)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Device notify error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
