import { createClient } from '@/lib/supabase/server'

export type Rating = {
  id: number
  deviceSlug: string
  userId: string
  displayName: string
  avatarUrl: string | null
  rating: number
  experience: string | null
  verifiedOwner: boolean
  helpfulCount: number
  userVote: 1 | -1 | null
  createdAt: string
}

export type CommunityScore = {
  avgRating: number
  totalRatings: number
}

export async function getDeviceRatings(
  deviceSlug: string,
  currentUserId?: string,
): Promise<Rating[]> {
  const supabase = await createClient()

  const query = supabase
    .from('device_ratings')
    .select('*')
    .eq('device_slug', deviceSlug)
    .order('helpful_count', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: ratings, error } = await query

  if (error || !ratings || ratings.length === 0) {
    return []
  }

  const userIds = ratings.map((r) => r.user_id)

  const { data: profiles } = await supabase
    .from('community_profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  let voteMap: Map<number, 1 | -1 | null> = new Map()
  if (currentUserId && ratings.length > 0) {
    const { data: votes } = await supabase
      .from('rating_votes')
      .select('rating_id, vote')
      .in('rating_id', ratings.map((r) => r.id))
      .eq('user_id', currentUserId)

    voteMap = new Map((votes ?? []).map((v) => [v.rating_id, v.vote as 1 | -1]))
  }

  return ratings.map((r) => {
    const profile = profileMap.get(r.user_id)
    return {
      id: r.id,
      deviceSlug: r.device_slug,
      userId: r.user_id,
      displayName: profile?.display_name ?? 'Anonymous',
      avatarUrl: profile?.avatar_url ?? null,
      rating: r.rating,
      experience: r.experience,
      verifiedOwner: r.verified_owner,
      helpfulCount: r.helpful_count,
      userVote: voteMap.get(r.id) ?? null,
      createdAt: r.created_at,
    }
  })
}

export async function getCommunityScore(deviceSlug: string): Promise<CommunityScore | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('device_community_scores')
    .select('avg_rating, total_ratings')
    .eq('device_slug', deviceSlug)
    .single()

  if (error || !data) {
    return null
  }

  return {
    avgRating: Number(data.avg_rating),
    totalRatings: data.total_ratings,
  }
}

export async function upsertRating(params: {
  deviceSlug: string
  userId: string
  rating: number
  experience?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const verified = await isVerifiedOwner(params.userId, params.deviceSlug)

  const { error } = await supabase.from('device_ratings').upsert(
    {
      device_slug: params.deviceSlug,
      user_id: params.userId,
      rating: params.rating,
      experience: params.experience?.slice(0, 280) ?? null,
      verified_owner: verified,
    },
    { onConflict: 'device_slug,user_id' },
  )

  if (error) {
    return { error: error.message }
  }

  return {}
}

export async function isVerifiedOwner(userId: string, deviceSlug: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('verified_device_owners')
    .select('device_slug')
    .eq('user_id', userId)
    .eq('device_slug', deviceSlug)
    .maybeSingle()

  return !error && !!data
}

export async function voteOnRating(params: {
  ratingId: number
  userId: string
  vote: 1 | -1
}): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('rating_votes')
    .select('id, vote')
    .eq('rating_id', params.ratingId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (fetchError) {
    return { error: fetchError.message }
  }

  if (existing) {
    if ((existing.vote as number) === params.vote) {
      const { error: delErr } = await supabase
        .from('rating_votes')
        .delete()
        .eq('id', existing.id)
      if (delErr) return { error: delErr.message }
    } else {
      const { error: upErr } = await supabase
        .from('rating_votes')
        .update({ vote: params.vote })
        .eq('id', existing.id)
      if (upErr) return { error: upErr.message }
    }
  } else {
    const { error: insErr } = await supabase.from('rating_votes').insert({
      rating_id: params.ratingId,
      user_id: params.userId,
      vote: params.vote,
    })
    if (insErr) return { error: insErr.message }
  }

  return {}
}
