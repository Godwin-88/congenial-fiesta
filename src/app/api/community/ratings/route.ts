import { NextRequest, NextResponse } from 'next/server'
import { getDeviceRatings, getCommunityScore, upsertRating } from '@/lib/community/ratings'
import { redis, getRedisOrThrow } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { createClient } from '@/lib/supabase/server'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
})

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`ratings:get:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const deviceSlug = request.nextUrl.searchParams.get('deviceSlug')
    if (!deviceSlug) {
      return NextResponse.json({ error: 'Missing deviceSlug' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const [ratings, communityScore] = await Promise.all([
      getDeviceRatings(deviceSlug, session?.user?.id ?? undefined),
      getCommunityScore(deviceSlug),
    ])

    return NextResponse.json({ ratings, communityScore })
  } catch (error) {
    console.error('Ratings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`ratings:post:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to rate devices' }, { status: 401 })
    }

    const body = await request.json()
    const { deviceSlug, rating, experience } = body as {
      deviceSlug: string
      rating: number
      experience?: string
    }

    if (!deviceSlug || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    if (experience && typeof experience === 'string' && experience.length > 280) {
      return NextResponse.json({ error: 'Experience too long (max 280 chars)' }, { status: 400 })
    }

    await upsertRating({
      deviceSlug,
      userId: session.user.id,
      rating,
      experience,
    })

    const brandSlug = new URL(request.url).pathname.split('/')[4]
    await redis.del(`devices:detail:${brandSlug}:${deviceSlug}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ratings POST error:', error)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}
