'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Smartphone, Video, Clock, ArrowRight } from 'lucide-react'

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
        // Fetch admin user
        const res = await fetch('/api/admin/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user as AdminUser)
        }

        // Fetch stats
        const [articlesRes, devicesRes, teasersRes] = await Promise.all([
          fetch('/api/admin/articles?status=draft&limit=0'),
          fetch('/api/admin/devices?status=draft&limit=0').catch(() => ({ ok: false, json: async () => ({ total: 0 }) } as Response)),
          fetch('/api/admin/coming-soon?active=true&limit=0').catch(() => ({ ok: false, json: async () => ({ total: 0 }) } as Response)),
        ])

        const articles = articlesRes.ok ? await articlesRes.json() : { total: 0 }
        const devices = devicesRes.ok ? await devicesRes.json() : { total: 0 }
        const teasers = teasersRes.ok ? await teasersRes.json() : { total: 0 }

        setStats({
          draftArticles: articles.total ?? 0,
          draftDevices: devices.total ?? 0,
          activeTeasers: teasers.total ?? 0,
        })

        // Fetch recent activity (last 5 updated articles)
        const recentRes = await fetch('/api/admin/articles?limit=5')
        if (recentRes.ok) {
          const recentData = await recentRes.json()
          const items = (recentData.data ?? []).map((a: any) => ({
            type: 'article' as const,
            title: a.title,
            updatedAt: a.updated_at,
            href: `/admin/articles/${a.id}/edit`,
          }))
          setRecentActivity(items)
        }
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
        <div className="h-8 bg-[#1F2937] rounded w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[#1F2937] rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-[#1F2937] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
          {greeting}, {user?.display_name ?? 'there'}!
        </h1>
        <p className="text-gray-400 mt-1">Here's what's happening at FweezyTech.</p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/articles/create"
          className="bg-[#1F2937] rounded-lg p-4 border border-[#374151] hover:border-[#0066FF] transition-colors group"
        >
          <FileText className="text-[#0066FF] mb-2" size={24} />
          <p className="text-sm text-white font-medium">Write Article</p>
          <p className="text-xs text-gray-500 mt-1">Create new content</p>
        </Link>
        <Link
          href="/admin/devices/create"
          className="bg-[#1F2937] rounded-lg p-4 border border-[#374151] hover:border-[#0066FF] transition-colors group"
        >
          <Smartphone className="text-green-400 mb-2" size={24} />
          <p className="text-sm text-white font-medium">Add Device</p>
          <p className="text-xs text-gray-500 mt-1">New device review</p>
        </Link>
        <Link
          href="/admin/videos/create"
          className="bg-[#1F2937] rounded-lg p-4 border border-[#374151] hover:border-[#0066FF] transition-colors group"
        >
          <Video className="text-amber-400 mb-2" size={24} />
          <p className="text-sm text-white font-medium">Add Video</p>
          <p className="text-xs text-gray-500 mt-1">YouTube / TikTok</p>
        </Link>
        <Link
          href="/admin/coming-soon/create"
          className="bg-[#1F2937] rounded-lg p-4 border border-[#374151] hover:border-[#0066FF] transition-colors group"
        >
          <Clock className="text-purple-400 mb-2" size={24} />
          <p className="text-sm text-white font-medium">Add Teaser</p>
          <p className="text-xs text-gray-500 mt-1">Upcoming content</p>
        </Link>
      </div>

      {/* Content Status Chips */}
      {stats && (
        <div className="flex flex-wrap gap-3">
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.draftArticles > 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-gray-800/50 text-gray-500 border-gray-700'
          }`}>
            {stats.draftArticles} draft articles
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.draftDevices > 0
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-gray-800/50 text-gray-500 border-gray-700'
          }`}>
            {stats.draftDevices} draft devices
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            stats.activeTeasers > 0
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
              : 'bg-gray-800/50 text-gray-500 border-gray-700'
          }`}>
            {stats.activeTeasers} active teasers
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-[#1F2937] rounded-lg border border-[#374151]">
        <div className="px-4 py-3 border-b border-[#374151] flex justify-between items-center">
          <h2 className="text-sm font-medium text-white">Recent Activity</h2>
          <Link
            href="/admin/articles"
            className="text-xs text-[#0066FF] hover:text-blue-400 flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-[#374151]">
          {recentActivity.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 text-center">
              No recent activity
            </p>
          )}
          {recentActivity.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#111827] transition-colors"
            >
              <FileText size={16} className="text-gray-500 shrink-0" />
              <span className="text-sm text-gray-300 truncate flex-1">{item.title}</span>
              <span className="text-xs text-gray-600 shrink-0">
                {timeAgo(item.updatedAt)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Daily Tip */}
      <div className="bg-gradient-to-r from-[#0066FF]/10 to-transparent rounded-lg p-4 border border-[#0066FF]/20">
        <p className="text-xs text-[#0066FF] uppercase tracking-wider mb-1">💡 Daily Tip</p>
        <p className="text-sm text-gray-300">{DAILY_TIPS[tipIndex]}</p>
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