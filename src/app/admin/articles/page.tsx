'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, FileText } from 'lucide-react'

type Article = {
  id: number
  title: string
  slug: string
  category: string | null
  status: 'draft' | 'published'
  reading_time_minutes: number | null
  published_at: string | null
  updated_at: string
}

export default function ArticleListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get('status') ?? ''
  const currentPage = parseInt(searchParams.get('page') ?? '1')

  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const limit = 20
  const totalPages = Math.ceil(total / limit)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentStatus) params.set('status', currentStatus)
      params.set('page', String(currentPage))
      params.set('limit', String(limit))

      const res = await fetch(`/api/admin/articles?${params}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.data ?? [])
        setTotal(data.total ?? 0)
      }
    } catch (e) {
      console.error('Failed to fetch articles:', e)
    } finally {
      setLoading(false)
    }
  }, [currentStatus, currentPage])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Check for published=1 query param (redirect from create page)
  useEffect(() => {
    if (searchParams.get('published') === '1') {
      setToast({ message: 'Article published successfully!', type: 'success' })
      // Clean URL
      router.replace('/admin/articles')
    }
  }, [searchParams, router])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/articles/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== deleteId))
        setTotal(prev => prev - 1)
        setToast({ message: 'Article deleted', type: 'success' })
      } else {
        setToast({ message: 'Failed to delete article', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteTitle('')
    }
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const filteredArticles = searchQuery
    ? articles.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : articles

  const tabs = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-heading">Articles</h1>
        <Link
          href="/admin/articles/create"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Article
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {tabs.map(tab => {
          const isActive = currentStatus === tab.value
          const href = tab.value ? `/admin/articles?status=${tab.value}` : '/admin/articles'
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-primary/10 text-brand-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search articles…"
            className="bg-card text-foreground text-sm rounded-lg pl-8 pr-3 py-1.5
                       border border-border focus:border-brand-primary focus:outline-none w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Reading Time</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-6 bg-muted rounded" />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredArticles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No articles yet</p>
                    <Link
                      href="/admin/articles/create"
                      className="text-brand-primary text-sm hover:underline mt-1 inline-block"
                    >
                      Write your first article →
                    </Link>
                  </td>
                </tr>
              )}
              {!loading && filteredArticles.map(article => (
                <tr key={article.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="text-foreground hover:text-brand-primary font-medium"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {article.category ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      article.status === 'published'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {article.reading_time_minutes ? `${article.reading_time_minutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground/60 text-xs">
                    {timeAgo(article.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteId(article.id)
                          setDeleteTitle(article.title)
                        }}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-accent"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-1">
              {currentPage > 1 && (
                <Link
                  href={`/admin/articles?page=${currentPage - 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                  className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                >
                  Previous
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/articles?page=${currentPage + 1}${currentStatus ? `&status=${currentStatus}` : ''}`}
                  className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Article</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &ldquo;{deleteTitle}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteId(null); setDeleteTitle('') }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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