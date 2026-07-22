'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import RatingCard from '@/components/community/RatingCard'
import RatingsSkeleton from '@/components/community/RatingsSkeleton'
import type { Rating, CommunityScore } from '@/lib/community/ratings'

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-6 w-6 ${star <= Math.round(rating) ? 'fill-brand-primary text-brand-primary' : 'fill-muted text-muted'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

interface RatingsSectionProps {
  deviceSlug: string
  deviceName: string
}

export default function RatingsSection({ deviceSlug }: RatingsSectionProps) {
  const [ratings, setRatings] = useState<Rating[] | null>(null)
  const [communityScore, setCommunityScore] = useState<CommunityScore | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [sort, setSort] = useState<'top' | 'newest'>('top')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [userExperience, setUserExperience] = useState('')

  useEffect(() => {
    fetch(`/api/community/ratings?deviceSlug=${encodeURIComponent(deviceSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        setRatings(data.ratings ?? [])
        setCommunityScore(data.communityScore)
      })
      .catch(() => {})
  }, [deviceSlug])

  const handleSubmit = async () => {
    if (userRating === 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/community/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceSlug,
          rating: userRating,
          experience: userExperience || undefined,
        }),
      })
    if (res.ok) {
      setShowForm(false)
      const newRating: Rating = {
          id: Date.now(),
          deviceSlug,
          userId: '',
          displayName: 'You',
          avatarUrl: null,
          rating: userRating,
          experience: userExperience || null,
          verifiedOwner: false,
          helpfulCount: 0,
          userVote: null,
          createdAt: new Date().toISOString(),
        }
        setRatings((prev) => (prev ? [newRating, ...prev] : [newRating]))
        setShowForm(false)
      }
    } catch {
      // error silently
    } finally {
      setIsSubmitting(false)
    }
  }

  const sortedRatings = (ratings ?? []).filter((r) => r.deviceSlug === deviceSlug)
  const displayedRatings = sort === 'top'
    ? [...sortedRatings].sort((a, b) => b.helpfulCount - a.helpfulCount)
    : [...sortedRatings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <section className="mt-12">
      <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Community Ratings</h2>

      {communityScore && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Community Score</p>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-foreground">
              {communityScore.avgRating.toFixed(1)}
            </div>
            <div>
              <StarDisplay rating={Math.round(communityScore.avgRating)} />
              <p className="text-sm text-muted-foreground">({communityScore.totalRatings} ratings)</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Based on FweezyTech community members</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Button variant="default" size="sm" onClick={() => setShowForm(!showForm)}>
          Rate this device
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setUserRating(star)}
                className="transition-colors"
              >
                <svg
                  className={`h-6 w-6 ${star <= userRating ? 'fill-brand-primary text-brand-primary' : 'fill-muted text-muted'}`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>
          <textarea
            value={userExperience}
            onChange={(e) => setUserExperience(e.target.value.slice(0, 280))}
            placeholder="Share your experience (optional)"
            className="h-24 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{userExperience.length}/280</span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={userRating === 0 || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={sort} onValueChange={(v) => setSort(v as 'top' | 'newest')} className="mb-4">
        <TabsList>
          <TabsTrigger value="top">Top</TabsTrigger>
          <TabsTrigger value="newest">Newest</TabsTrigger>
        </TabsList>
      </Tabs>

      {ratings === null ? (
        <RatingsSkeleton />
      ) : ratings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ratings yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {displayedRatings.map((rating) => (
            <RatingCard key={rating.id} rating={rating} currentUserId={null} />
          ))}
        </div>
      )}
    </section>
  )
}
