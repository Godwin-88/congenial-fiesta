import { NextRequest, NextResponse } from 'next/server'
import { reportComment } from '@/lib/community/comments'
import { Ratelimit } from '@upstash/ratelimit'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { createClient } from '@/lib/supabase/server'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`comments:report:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to report' }, { status: 401 })
    }

    const body = await request.json()
    const { commentId } = body as { commentId: number }

    if (typeof commentId !== 'number') {
      return NextResponse.json({ error: 'Invalid commentId' }, { status: 400 })
    }

    const result = await reportComment(commentId)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment report error:', error)
    return NextResponse.json({ error: 'Failed to report' }, { status: 500 })
  }
}
