'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Smartphone, Video, Clock, Eye, MousePointerClick, ArrowRight } from 'lucide-react'

type AdminUser = {
  id: string
  display_name: string
  role: 'admin' | 'editor' | 'viewer'
}

const DAILY_TIPS = [
  'Use the "Cmd+S" shortcut to save drafts quickly',
  'Add alt text to all images for better accessibility',
  'Keep article excerpts under 160 characters for optimal search results',
  'Use comparison articles to drive more affiliate clicks',
  'Tag devices in articles to improve internal linking',
  'Schedule your best content for Tuesday mornings',
  'Update featured images regularly to keep content fresh',
]

export default function AdminDashboardPage() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<{
    draftArticles: number
    draftDevices: number
    activeTeasers: number
  } | null>(null)
  const [analytics, setAnalytics] = useState<{
    pageViewsToday: number
    topDevicePage: string | null
    affiliateClicksWeek: number
  } | null>(null)
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string
    title: string
    updatedAt: string
    href: string
  }>>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const tipIndex = today.getDay()

  useEffect(() => {
    async function load() {
      try {
        const [meRes, articlesRes, devicesRes, teasersRes, analyticsRes] = await Promise.all([
          fetch('/api/admin/auth/me').catch(() => null),
          fetch('/api/admin/articles?status=draft&limit=0').catch(() => null),
          fetch('/api/admin/devices?status=draft&limit=0').catch(() => null),
          fetch('/api/admin/coming-soon?active=true&limit=0').catch(() => null),
          fetch('/api/admin/analytics-summary').catch(() => null),
        ])

        if (meRes?.ok) {
          const data = await meRes.json()
          setUser(data.user as AdminUser)
        }

        const articles = articlesRes?.ok ? await articlesRes.json() : { total: 0 }
        const devices = devicesRes?.ok ? await devicesRes.json() : { total: 0 }
        const teasers = teasersRes?.ok ? await teasersRes.json() : { total: 0 }

        setStats({
          draftArticles: articles.total ?? 0,
          draftDevices: devices.total ?? 0,
          activeTeasers: teasers.total ?? 0,
        })

        if (analyticsRes?.ok) {
          const analyticsData = await analyticsRes.json()
          setAnalytics(analyticsData)
        }

        const activityItems: Array<{ type: string; title: string; updatedAt: string; href: string }> = []

        if (articlesRes?.ok) {
          const recentArticles = await fetch('/api/admin/articles?limit=5&page=1').then(r => r.json()).catch(() => ({ data: [] }))
          for (const a of (recentArticles.data ?? []).slice(0, 3)) {
            activityItems.push({
              type: 'article',
              title: a.title,
              updatedAt: a.updated_at,
              href: `/admin/articles/${a.id}/edit`,
            })
          }
        }

        if (devicesRes?.ok) {
          const recentDevices = await fetch('/api/admin/devices?limit=5&page=1').then(r => r.json()).catch(() => ({ data: [] }))
          for (const d of (recentDevices.data ?? []).slice(0, 2)) {
            activityItems.push({
              type: 'device',
              title: d.name,
              updatedAt: d.updated_at,
              href: `/admin/devices/${d.id}/edit`,
            })
          }
        }

        activityItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        setRecentActivity(activityItems.slice(0, 5))
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-heading">
          {greeting}, {user?.display_name ?? 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening at FweezyTech.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/articles/create"
          className="bg-card rounded-lg p-4 border border-border hover:border-brand-primary transition-colors group"
        >
          <FileText className="text-brand-primary mb-2" size={24} />
          <p className="text-sm text-foreground font-medium">Write Article</p>
          <p className="text-xs text-muted-foreground mt-1">Create new content</p>
        </Link>
        <Link
          href="/admin/devices/create"
          className="bg-card rounded-lg p-4 border border-border hover:border-brand-primary transition-colors group"
        >
          <Smartphone className="text-green-400 mb-2" size={24} />
          <p className="text-sm text-foreground font-medium">Add Device</p>
          <p className="text-xs text-muted-foreground mt-1">New device review</p>
        </Link>
        <Link
          href="/admin/videos/create"
          className="bg-card rounded-lg p-4 border border-border hover:border-brand-primary transition-colors group"
        >
          <Video className="text-amber-400 mb-2" size={24} />
          <p className="text-sm text-foreground font-medium">Add Video</p>
          <p className="text-xs text-muted-foreground mt-1">YouTube / TikTok</p>
        </Link>
        <Link
          href="/admin/coming-soon/create"
          className="bg-card rounded-lg p-4 border border-border hover:border-brand-primary transition-colors group"
        >
          <Clock className="text-purple-400 mb-2" size={24} />
          <p className="text-sm text-foreground font-medium">Add Teaser</p>
          <p className="text-xs text-muted-foreground mt-1">Upcoming content</p>
        </Link>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.draftArticles > 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {stats.draftArticles} draft articles
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.draftDevices > 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {stats.draftDevices} draft devices
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.activeTeasers > 0
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            {stats.activeTeasers} active teasers
          </div>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
              <Eye size={14} className="text-brand-primary" /> Page Views Today
            </p>
            <p className="text-2xl font-bold text-foreground">{analytics.pageViewsToday.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
              <Eye size={14} className="text-amber-400" /> Top Device Page Today
            </p>
            <p className="text-sm font-bold text-foreground truncate">
              {analytics.topDevicePage ?? 'N/A'}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
              <MousePointerClick size={14} className="text-green-500" /> Affiliate Clicks
            </p>
            <p className="text-2xl font-bold text-foreground">{analytics.affiliateClicksWeek.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border flex justify-between items-center">
          <h2 className="text-sm font-medium text-foreground">Recent Activity</h2>
          <Link
            href="/admin/articles"
            className="text-xs text-brand-primary hover:text-brand-primary/80 flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No recent activity
            </p>
          )}
          {recentActivity.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
            >
              {item.type === 'article' ? (
                <FileText size={16} className="text-muted-foreground shrink-0" />
              ) : (
                <Smartphone size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className="text-sm text-foreground/80 truncate flex-1">{item.title}</span>
              <span className="text-xs text-muted-foreground/60 shrink-0">
                {timeAgo(item.updatedAt)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-brand-primary/10 to-transparent rounded-lg p-4 border border-brand-primary/20">
        <p className="text-xs text-brand-primary uppercase tracking-wider mb-1">Daily Tip</p>
        <p className="text-sm text-foreground/80">{DAILY_TIPS[tipIndex]}</p>
      </div>
    </div>
  )
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}