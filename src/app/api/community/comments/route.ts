import { NextRequest, NextResponse } from 'next/server'
import { getComments, postComment } from '@/lib/community/comments'
import { Ratelimit } from '@upstash/ratelimit'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { createClient } from '@/lib/supabase/server'
import { containsProfanity } from '@/lib/community/profanity'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(30, '1 m'),
})

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`comments:get:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const contentType = request.nextUrl.searchParams.get('contentType') as
      | 'article'
      | 'video'
      | 'device'
      | null
    const contentSlug = request.nextUrl.searchParams.get('contentSlug')
    const sort = (request.nextUrl.searchParams.get('sort') as 'top' | 'newest') ?? 'top'

    if (!contentType || !['article', 'video', 'device'].includes(contentType) || !contentSlug) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const comments = await getComments({
      contentType,
      contentSlug,
      sort,
      currentUserId: session?.user?.id,
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(`comments:post:${ip}`)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 })
    }

    const body = await request.json()
    const { contentType, contentSlug, body: commentBody, parentId } = body as {
      contentType: 'article' | 'video' | 'device'
      contentSlug: string
      body: string
      parentId?: number
    }

    if (!contentType || !['article', 'video', 'device'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 })
    }

    if (!contentSlug || typeof contentSlug !== 'string' || contentSlug.length === 0) {
      return NextResponse.json({ error: 'Missing contentSlug' }, { status: 400 })
    }

    if (!commentBody || typeof commentBody !== 'string' || commentBody.length < 1 || commentBody.length > 2000) {
      return NextResponse.json({ error: 'Comment body must be 1-2000 characters' }, { status: 400 })
    }

    if (containsProfanity(commentBody)) {
      return NextResponse.json({ error: 'Comment contains inappropriate content' }, { status: 400 })
    }

    if (parentId !== undefined) {
      const { data: parent, error: parentErr } = await supabase
        .from('comments')
        .select('id, parent_id')
        .eq('id', parentId)
        .single()

      if (parentErr || !parent || parent.parent_id !== null) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 })
      }
    }

    const result = await postComment({
      contentType,
      contentSlug,
      userId: session.user.id,
      body: commentBody,
      parentId: typeof parentId === 'number' ? parentId : undefined,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ comment: result.comment })
  } catch (error) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  }
}
