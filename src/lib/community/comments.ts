import { createClient } from '@/lib/supabase/server'

export type Comment = {
  id: number
  contentType: 'article' | 'video' | 'device'
  contentSlug: string
  userId: string
  displayName: string
  avatarUrl: string | null
  isCreator: boolean
  parentId: number | null
  body: string
  helpfulCount: number
  userVote: 1 | -1 | null
  reported: boolean
  createdAt: string
  updatedAt: string
  replies: Comment[]
}

const CREATOR_ID = process.env.FWEEZYTECH_CREATOR_USER_ID ?? ''

export async function getComments(params: {
  contentType: 'article' | 'video' | 'device'
  contentSlug: string
  sort: 'top' | 'newest'
  currentUserId?: string
}): Promise<Comment[]> {
  const supabase = await createClient()

  const orderColumn = params.sort === 'top' ? 'helpful_count' : 'created_at'
  const ascending = params.sort === 'top' ? false : false

  const { data: topLevel, error } = await supabase
    .from('comments')
    .select('*')
    .eq('content_type', params.contentType)
    .eq('content_slug', params.contentSlug)
    .is('parent_id', null)
    .order(orderColumn, { ascending })
    .order('created_at', { ascending: false })

  if (error || !topLevel || topLevel.length === 0) {
    return []
  }

  const userIds = topLevel.map((c) => c.user_id)

  const { data: profiles } = await supabase
    .from('community_profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  let voteMap: Map<number, 1 | -1 | null> = new Map()
  if (params.currentUserId && topLevel.length > 0) {
    const { data: votes } = await supabase
      .from('comment_votes')
      .select('comment_id, vote')
      .in('comment_id', topLevel.map((c) => c.id))
      .eq('user_id', params.currentUserId)

    voteMap = new Map((votes ?? []).map((v) => [v.comment_id, v.vote as 1 | -1]))
  }

  const topComments: Comment[] = topLevel.map((c) => {
    const profile = profileMap.get(c.user_id)
    return {
      id: c.id,
      contentType: c.content_type as Comment['contentType'],
      contentSlug: c.content_slug,
      userId: c.user_id,
      displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl: profile?.avatar_url ?? null,
      isCreator: c.user_id === CREATOR_ID,
      parentId: c.parent_id,
      body: c.body,
      helpfulCount: c.helpful_count,
      userVote: voteMap.get(c.id) ?? null,
      reported: c.reported,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      replies: [],
    }
  })

  for (const parent of topComments) {
    const { data: replies } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: true })

    if (replies && replies.length > 0) {
      parent.replies = await Promise.all(
        replies.map(async (r) => {
          const p = profileMap.get(r.user_id)
          let replyUserVote: 1 | -1 | null = null
          if (params.currentUserId) {
            const { data: replyVotes } = await supabase
              .from('comment_votes')
              .select('vote')
              .eq('comment_id', r.id)
              .eq('user_id', params.currentUserId)
              .maybeSingle()
            replyUserVote = (replyVotes?.vote as 1 | -1) ?? null
          }
          return {
            id: r.id,
            contentType: r.content_type,
            contentSlug: r.content_slug,
            userId: r.user_id,
            displayName: p?.display_name ?? 'Anonymous',
            avatarUrl: p?.avatar_url ?? null,
            isCreator: r.user_id === CREATOR_ID,
            parentId: r.parent_id,
            body: r.body,
            helpfulCount: r.helpful_count,
            userVote: replyUserVote,
            reported: r.reported,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            replies: [],
          }
        }),
      )
    }
  }

  return topComments
}

export async function postComment(params: {
  contentType: 'article' | 'video' | 'device'
  contentSlug: string
  userId: string
  body: string
  parentId?: number
}): Promise<{ comment?: Comment; error?: string }> {
  const supabase = await createClient()

  if (params.parentId !== undefined) {
    const { data: parent, error: parentErr } = await supabase
      .from('comments')
      .select('id, parent_id')
      .eq('id', params.parentId)
      .single()

    if (parentErr || !parent || parent.parent_id !== null) {
      return { error: 'Invalid parent comment' }
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      content_type: params.contentType,
      content_slug: params.contentSlug,
      user_id: params.userId,
      body: params.body,
      parent_id: params.parentId ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Failed to post comment' }
  }

  const { data: profile } = await supabase
    .from('community_profiles')
    .select('display_name, avatar_url')
    .eq('id', params.userId)
    .single()

  return {
    comment: {
      id: data.id,
      contentType: data.content_type,
      contentSlug: data.content_slug,
      userId: data.user_id,
      displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl: profile?.avatar_url ?? null,
      isCreator: data.user_id === CREATOR_ID,
      parentId: data.parent_id,
      body: data.body,
      helpfulCount: data.helpful_count,
      userVote: null,
      reported: data.reported,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      replies: [],
    },
  }
}

export async function voteOnComment(params: {
  commentId: number
  userId: string
  vote: 1 | -1
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('comment_votes')
    .select('id, vote')
    .eq('comment_id', params.commentId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  if (existing) {
    if ((existing.vote as number) === params.vote) {
      const { error: delErr } = await supabase
        .from('comment_votes')
        .delete()
        .eq('id', existing.id)
      if (delErr) return { error: delErr.message }
    } else {
      const { error: upErr } = await supabase
        .from('comment_votes')
        .update({ vote: params.vote })
        .eq('id', existing.id)
      if (upErr) return { error: upErr.message }
    }
  } else {
    const { error: insErr } = await supabase.from('comment_votes').insert({
      comment_id: params.commentId,
      user_id: params.userId,
      vote: params.vote,
    })
    if (insErr) return { error: insErr.message }
  }

  return {}
}

export async function reportComment(commentId: number): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('comments')
    .update({ reported: true })
    .eq('id', commentId)

  if (error) {
    return { error: error.message }
  }

  return {}
}
