'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const TiptapEditor = dynamic(
  () => import('@/components/admin/TiptapEditor'),
  { ssr: false, loading: () => (
    <div className="h-[500px] bg-[#1F2937] rounded-lg animate-pulse" />
  )}
)

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const CATEGORIES = [
  { value: '', label: 'Select category…' },
  { value: 'review', label: 'Review' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'news', label: 'News' },
  { value: 'buying-guide', label: 'Buying Guide' },
  { value: 'opinion', label: 'Opinion' },
]

export default function EditArticlePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastSavedContent = useRef<string>('')

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [bodyJson, setBodyJson] = useState<Record<string, unknown> | null>(null)
  const [bodyHtml, setBodyHtml] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [seoOpen, setSeoOpen] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch article
  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/admin/articles/${id}`)
        if (!res.ok) {
          if (res.status === 404) setNotFound(true)
          return
        }
        const { data } = await res.json()
        if (!data) {
          setNotFound(true)
          return
        }
        setTitle(data.title ?? '')
        setSlug(data.slug ?? '')
        setExcerpt(data.excerpt ?? '')
        setFeaturedImage(data.featured_image ?? '')
        setBodyJson(data.body)
        setBodyHtml(data.body_html ?? '')
        setCategory(data.category ?? '')
        setTags((data.tags ?? []).join(', '))
        setStatus(data.status ?? 'draft')
        setSeoTitle(data.seo_title ?? '')
        setSeoDescription(data.seo_description ?? '')
        setUpdatedAt(data.updated_at)
      } catch (e) {
        console.error('Failed to fetch article:', e)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [id])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title))
    }
  }, [title, slugManuallyEdited])

  // Auto-save
  const triggerAutoSave = useCallback(() => {
    if (!title || title.trim().length < 3) return
    const currentContent = JSON.stringify({ title, bodyHtml, excerpt })
    if (currentContent === lastSavedContent.current) return

    setSaveStatus('saving')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      await handleSave('draft', true)
    }, 30000)
  }, [title, bodyHtml, excerpt])

  useEffect(() => {
    triggerAutoSave()
    return () => clearTimeout(autoSaveTimer.current)
  }, [triggerAutoSave])

  async function handleSave(
    saveStatusParam: 'draft' | 'published' = 'draft',
    isAutoSave = false
  ) {
    const newErrors: Record<string, string> = {}
    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }
    if (!slug.trim()) {
      newErrors.slug = 'Slug is required'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (!isAutoSave) setSaveStatus('error')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      featuredImage: featuredImage.trim() || null,
      bodyJson,
      bodyHtml: bodyHtml || null,
      category: category || null,
      tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      status: saveStatusParam,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    }

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors({ form: data.error ?? 'Save failed' })
        setSaveStatus('error')
        return
      }

      lastSavedContent.current = JSON.stringify({ title, bodyHtml, excerpt })
      setSaveStatus('saved')
      setErrors({})
      setUpdatedAt(new Date().toISOString())

      if (!isAutoSave && saveStatusParam === 'published') {
        router.push('/admin/articles?published=1')
      }
    } catch {
      setErrors({ form: 'Network error' })
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave('draft')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [title, slug, bodyJson, bodyHtml, excerpt, category, tags, status])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin/articles')
      } else {
        setErrors({ form: 'Failed to delete' })
      }
    } catch {
      setErrors({ form: 'Network error' })
    } finally {
      setDeleting(false)
      setShowDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#1F2937] rounded w-64" />
        <div className="h-[500px] bg-[#1F2937] rounded-lg" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Article not found</h1>
        <p className="text-gray-400 mb-4">This article doesn't exist or has been deleted.</p>
        <Link href="/admin/articles" className="text-[#0066FF] hover:underline">
          ← Back to Articles
        </Link>
      </div>
    )
  }

  const canSave = title.trim().length >= 3

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push('/admin/articles')}
            className="text-sm text-gray-400 hover:text-white mb-1 flex items-center gap-1"
          >
            ← Articles
          </button>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
            Edit Article
          </h1>
          {updatedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated {timeAgo(updatedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="text-sm text-gray-400">
            {saveStatus === 'saving' && <span className="text-blue-400">Saving…</span>}
            {saveStatus === 'saved' && <span className="text-green-400">✓ Saved</span>}
            {saveStatus === 'error' && <span className="text-red-400">Save failed</span>}
          </div>

          {/* Unpublish button */}
          {status === 'published' && (
            <button
              onClick={() => handleSave('draft')}
              className="px-3 py-1.5 text-sm border border-amber-500/50 text-amber-400
                         rounded-lg hover:bg-amber-500/10 transition-colors"
            >
              Unpublish
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={() => setShowDelete(true)}
            className="px-3 py-1.5 text-sm border border-red-500/50 text-red-400
                       rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Form error */}
      {errors.form && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {errors.form}
        </div>
      )}

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article title…"
              className={[
                'w-full bg-transparent text-3xl font-bold text-white',
                'placeholder-gray-600 border-0 border-b pb-2 focus:outline-none',
                "font-['Space_Grotesk']",
                errors.title ? 'border-red-500' : 'border-[#374151] focus:border-[#0066FF]',
              ].join(' ')}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 shrink-0">fweezytech.com/articles/</span>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
              className="bg-[#1F2937] text-gray-300 px-2 py-1 rounded border border-[#374151]
                         focus:border-[#0066FF] focus:outline-none font-mono text-xs flex-1"
            />
          </div>

          {/* Excerpt */}
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short summary… (max 300 chars)"
            maxLength={300}
            rows={2}
            className="w-full bg-[#1F2937] text-gray-300 placeholder-gray-600 rounded-lg px-3 py-2
                       border border-[#374151] focus:border-[#0066FF] focus:outline-none resize-none text-sm"
          />
          <div className="text-xs text-gray-600 text-right -mt-2">{excerpt.length}/300</div>

          {/* Rich text editor */}
          <TiptapEditor
            content={bodyJson}
            onChange={(json, html) => { setBodyJson(json); setBodyHtml(html) }}
            placeholder="Start writing your article…"
            minHeight={500}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Actions */}
          <div className="bg-[#1F2937] rounded-lg p-4 space-y-3 border border-[#374151]">
            <button
              onClick={() => handleSave('draft')}
              disabled={!canSave || isSaving}
              className="w-full py-2 px-4 rounded-lg border border-[#374151] text-gray-300
                         hover:border-[#0066FF] hover:text-white transition-colors text-sm font-medium disabled:opacity-40"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={!canSave || isSaving}
              className="w-full py-2 px-4 rounded-lg bg-[#0066FF] text-white hover:bg-blue-500
                         transition-colors text-sm font-medium disabled:opacity-40"
            >
              Publish
            </button>
            {slug && (
              <a
                href={`/articles/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-gray-500 hover:text-[#0066FF]"
              >
                Preview on site ↗
              </a>
            )}
            <p className="text-xs text-gray-600 text-center">Cmd+S to save draft</p>
          </div>

          {/* Status */}
          <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'published')}
              className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                         border border-[#374151] focus:border-[#0066FF] focus:outline-none"
            >
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
            </select>
          </div>

          {/* Category */}
          <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                         border border-[#374151] focus:border-[#0066FF] focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Featured Image */}
          <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Featured Image</label>
            <input
              type="url"
              value={featuredImage}
              onChange={e => setFeaturedImage(e.target.value)}
              placeholder="Cloudflare Images URL…"
              className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                         border border-[#374151] focus:border-[#0066FF] focus:outline-none"
            />
            {featuredImage && (
              <img
                src={featuredImage}
                alt="Preview"
                className="mt-2 rounded w-full h-24 object-cover"
                onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
          </div>

          {/* Tags */}
          <div className="bg-[#1F2937] rounded-lg p-4 border border-[#374151]">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="samsung, android, flagship…"
              className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                         border border-[#374151] focus:border-[#0066FF] focus:outline-none"
            />
            <p className="text-xs text-gray-600 mt-1">Comma-separated</p>
          </div>

          {/* SEO */}
          <div className="bg-[#1F2937] rounded-lg border border-[#374151] overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider
                         flex justify-between items-center hover:text-white"
            >
              🔍 SEO <span>{seoOpen ? '▲' : '▼'}</span>
            </button>
            {seoOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                    className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                               border border-[#374151] focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Meta Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={e => setSeoDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-[#111827] text-white rounded px-3 py-2 text-sm
                               border border-[#374151] focus:outline-none focus:border-[#0066FF] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1F2937] rounded-lg border border-[#374151] p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Article</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{title}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#374151] rounded-lg"
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