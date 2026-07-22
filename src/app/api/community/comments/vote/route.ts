import { NextRequest, NextResponse } from 'next/server'
import { voteOnComment } from '@/lib/community/comments'
import { Ratelimit } from '@upstash/ratelimit'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { createClient } from '@/lib/supabase/server'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`comments:vote:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
    }

    const body = await request.json()
    const { commentId, vote } = body as { commentId: number; vote: number }

    if (typeof commentId !== 'number' || ![1, -1].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
    }

    const result = await voteOnComment({ commentId, userId: session.user.id, vote: vote as 1 | -1 })
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment vote error:', error)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}
