'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { ArticleCard } from '@/components/articles/ArticleCard'
import SavedComparisonsList from '@/components/compare/SavedComparisonsList'

type SavedItem = {
  id: number
  content_type: 'article' | 'device' | 'comparison'
  content_id: string
  metadata: {
    title?: string
    excerpt?: string
    featuredImage?: string
    category?: string
  }
  created_at: string
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'article', label: 'Articles' },
  { value: 'device', label: 'Devices' },
  { value: 'comparison', label: 'Comparisons' },
]

export default function SavedPage() {
  const { user, isLoading } = useAuth()
  const [items, setItems] = useState<SavedItem[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setFetching(false)
      return
    }

    const contentType = activeTab === 'all' ? '' : activeTab
    const url = contentType
      ? `/api/user/saved?contentType=${contentType}`
      : '/api/user/saved'

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setItems(data.data ?? [])
        setFetching(false)
      })
      .catch(() => {
        setFetching(false)
      })
  }, [user, isLoading, activeTab])

  const handleRemove = async (item: SavedItem) => {
    const res = await fetch(`/api/user/saved?contentType=${item.content_type}&contentId=${item.content_id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  const showComparisonsTab = activeTab === 'comparison' || activeTab === 'all'

  if (isLoading || fetching) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        My Saved
      </h1>
      <p className="mt-1 text-muted-foreground">Articles, devices, and comparisons you've saved.</p>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-brand-primary text-white'
                : 'bg-muted text-foreground/60 hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comparisons section */}
      {showComparisonsTab && (
        <section className="mt-8">
          <h2 className="font-heading text-xl font-bold text-foreground mb-4">
            Saved Comparisons
          </h2>
          <SavedComparisonsList />
        </section>
      )}

      {/* Other saved items (articles + devices) */}
      {items.filter(i => i.content_type !== 'comparison').length === 0 && !showComparisonsTab ? (
        <div className="mt-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto text-muted-foreground/40"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="mt-4 text-foreground/40">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-foreground/30">
            Click the bookmark icon on articles, devices, or comparisons to save them here.
          </p>
          <Link
            href="/articles"
            className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 transition-colors"
          >
            Browse Articles
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items
            .filter(i => i.content_type !== 'comparison')
            .map(item => (
            <div key={item.id} className="relative group">
              {item.content_type === 'article' ? (
                <ArticleCard
                  slug={item.content_id}
                  title={item.metadata.title ?? ''}
                  excerpt={item.metadata.excerpt}
                  featuredImage={item.metadata.featuredImage}
                  category={item.metadata.category}
                />
              ) : (
                <Link
                  href={`/devices/${item.content_id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-foreground">{item.metadata.title ?? item.content_id}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Device</p>
                </Link>
              )}
              <button
                onClick={() => handleRemove(item)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm
                           border border-border opacity-0 group-hover:opacity-100 transition-opacity
                           text-muted-foreground hover:text-destructive"
                aria-label="Remove from saved"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}