import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/chat/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'

  // Rate limit session fetch
  const { Redis } = await import('@upstash/redis')
  const { Ratelimit } = await import('@upstash/ratelimit')

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const sessionRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'chat:session:fetch',
  })

  const { success } = await sessionRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { messages: [], error: 'Rate limited' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ messages: [] })
  }

  const session = await getSession(sessionId).catch(() => null)

  if (!session) {
    return NextResponse.json({ messages: [] })
  }

  return NextResponse.json({ messages: session.messages })
}