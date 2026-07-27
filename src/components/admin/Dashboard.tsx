'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const TIPS = [
  "💡 Set priceDate on buy links so visitors see accurate pricing.",
  "💡 Add a YouTube video ID to device pages to boost engagement.",
  "💡 Publish coming-soon teasers before reviews to build hype.",
  "💡 Fill all 5 Fweezy Score dimensions — the overall score auto-computes.",
  "💡 Use the excerpt field on articles — it shows in search results.",
  "💡 Mark one image as isPrimary on every device — it powers OG images.",
  "💡 Update MediaKit follower counts monthly for accurate press kit PDFs.",
]

export default function Dashboard() {
  const [displayName, setDisplayName] = useState<string>('')
  const [draftDevices, setDraftDevices] = useState<number | null>(null)
  const [draftArticles, setDraftArticles] = useState<number | null>(null)
  const [activeTeasers, setActiveTeasers] = useState<number | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const todayTip = TIPS[new Date().getDay()]

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data?.user?.displayName) setDisplayName(data.user.displayName)
        else if (data?.user?.email) setDisplayName(data.user.email.split('@')[0])
      })
      .catch(() => {})

    fetch('/api/devices?where[status][equals]=draft&limit=0', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setDraftDevices(data?.totalDocs ?? 0))
      .catch(() => setDraftDevices(0))

    fetch('/api/articles?where[status][equals]=draft&limit=0', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setDraftArticles(data?.totalDocs ?? 0))
      .catch(() => setDraftArticles(0))

    fetch('/api/coming-soon?where[active][equals]=true&limit=0', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setActiveTeasers(data?.totalDocs ?? 0))
      .catch(() => setActiveTeasers(0))
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--theme-elevation-800)', margin: 0 }}>
          {greeting}{displayName ? `, ${displayName}` : ''}! 👋
        </h1>
        <p style={{ color: 'var(--theme-elevation-500)', marginTop: 4 }}>
          Welcome to the FweezyTech CMS. Here's what needs attention today.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1rem', fontWeight: 600, color: 'var(--theme-elevation-500)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem',
        }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {[
            { emoji: '📱', label: 'Add New Device', sub: 'Create a device review page', href: '/admin/collections/devices/create' },
            { emoji: '✍️', label: 'Write New Article', sub: 'Publish a review or guide', href: '/admin/collections/articles/create' },
            { emoji: '▶️', label: 'Add Video', sub: 'Add TikTok, IG, or FB video', href: '/admin/collections/videos/create' },
            { emoji: '🔮', label: 'Coming Soon Teaser', sub: 'Build hype for next review', href: '/admin/collections/coming-soon/create' },
          ].map(action => (
            <Link key={action.href} href={action.href} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '1rem 1.25rem',
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 10,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0066FF' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--theme-elevation-150)' }}
            >
              <span style={{ fontSize: '1.5rem' }}>{action.emoji}</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--theme-elevation-800)', fontSize: '0.95rem' }}>
                  {action.label}
                </div>
                <div style={{ color: 'var(--theme-elevation-500)', fontSize: '0.8rem', marginTop: 2 }}>
                  {action.sub}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1rem', fontWeight: 600, color: 'var(--theme-elevation-500)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem',
        }}>
          Content Status
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Devices in draft', count: draftDevices, href: '/admin/collections/devices?where[status][equals]=draft' },
            { label: 'Articles in draft', count: draftArticles, href: '/admin/collections/articles?where[status][equals]=draft' },
            { label: 'Active teasers', count: activeTeasers, href: '/admin/collections/coming-soon' },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0.5rem 1rem',
              background: item.count && item.count > 0 ? 'color-mix(in srgb, var(--theme-warning) 15%, transparent)' : 'var(--theme-elevation-50)',
              border: `1px solid ${item.count && item.count > 0 ? 'var(--theme-warning)' : 'var(--theme-elevation-150)'}`,
              borderRadius: 999,
              textDecoration: 'none',
              color: item.count && item.count > 0 ? 'var(--theme-warning)' : 'var(--theme-elevation-500)',
              fontSize: '0.85rem', fontWeight: 500,
            }}>
              <span style={{
                background: item.count && item.count > 0 ? 'var(--theme-warning)' : 'var(--theme-elevation-150)',
                color: item.count && item.count > 0 ? '#111827' : 'var(--theme-elevation-800)',
                borderRadius: 999, padding: '0 6px', fontSize: '0.75rem', fontWeight: 700,
                minWidth: 20, textAlign: 'center',
              }}>
                {item.count === null ? '…' : item.count}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Daily Tip */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'color-mix(in srgb, #0066FF 8%, transparent)',
        border: '1px solid color-mix(in srgb, #0066FF 25%, transparent)',
        borderRadius: 10,
        color: 'var(--theme-elevation-600)',
        fontSize: '0.875rem',
      }}>
        {todayTip}
      </div>

    </div>
  )
}