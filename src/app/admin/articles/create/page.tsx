'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Editor } from '@tiptap/react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'
import ArticleImagesPanel from '@/components/admin/ArticleImagesPanel'
import { uploadImageFile } from '@/lib/client-upload'

const TiptapEditor = dynamic(
  () => import('@/components/admin/TiptapEditor'),
  { ssr: false, loading: () => (
    <div className="h-[500px] bg-muted rounded-lg animate-pulse" />
  )}
)

// Slugify utility
function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Category options
const CATEGORIES = [
  { value: '', label: 'Select category…' },
  { value: 'review', label: 'Review' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'news', label: 'News' },
  { value: 'buying-guide', label: 'Buying Guide' },
  { value: 'opinion', label: 'Opinion' },
]

export default function CreateArticlePage() {
  const router = useRouter()
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastSavedContent = useRef<string>('')

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

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [articleId, setArticleId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [seoOpen, setSeoOpen] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [featuredUploading, setFeaturedUploading] = useState(false)
  const featuredFileRef = useRef<HTMLInputElement>(null)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  async function handleFeaturedUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFeaturedUploading(true)
    try {
      const url = await uploadImageFile(file)
      setFeaturedImage(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setFeaturedUploading(false)
      if (featuredFileRef.current) featuredFileRef.current.value = ''
    }
  }

  // Track dirty state when any form field changes
  useEffect(() => {
    if (title || slug || excerpt || featuredImage || bodyHtml || category || tags || seoTitle || seoDescription) {
      setDirty(true)
    }
  }, [title, slug, excerpt, featuredImage, bodyHtml, category, tags, seoTitle, seoDescription])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(slugify(title))
    }
  }, [title, slugManuallyEdited])

  // Auto-save every 30 seconds when content changes
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

  // Save handler
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
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: saveStatusParam,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    }

    try {
      const url = articleId
        ? `/api/admin/articles/${articleId}`
        : '/api/admin/articles'
      const method = articleId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: { data?: { id: number }; error?: string } = await res.json()

      if (!res.ok) {
        setErrors({ form: data.error ?? 'Save failed — please try again' })
        setSaveStatus('error')
        return
      }

      if (data.data?.id && !articleId) {
        setArticleId(data.data.id)
        // Move to the real edit route so the saved article lives on a proper page
        router.replace(`/admin/articles/${data.data.id}/edit`)
      }

      lastSavedContent.current = JSON.stringify({ title, bodyHtml, excerpt })
      setSaveStatus('saved')
      resetDirty()
      setErrors({})

      if (!isAutoSave && saveStatusParam === 'published') {
        // Show success and redirect to article list
        router.push('/admin/articles?published=1')
      }
    } catch {
      setErrors({ form: 'Network error — check your connection' })
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  // Keyboard shortcut: Cmd/Ctrl+S
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

  const canSave = title.trim().length >= 3

  return (
    <div className="max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => {
              if (isDirty) {
                setDirty(true)
                return
              }
              router.push('/admin/articles')
            }}
            className="text-sm text-muted-foreground hover:text-foreground mb-1 flex items-center gap-1"
          >
            ← Articles
          </button>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            New Article
          </h1>
        </div>

        {/* Save status indicator */}
        <div className="text-sm text-muted-foreground">
          {saveStatus === 'saving' && (
            <span className="text-blue-400">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-400">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400">Save failed</span>
          )}
        </div>
      </div>

      {/* Form error */}
      {errors.form && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm">
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
              autoFocus
              className={[
                'w-full bg-transparent text-3xl font-bold text-foreground',
                'placeholder-muted-foreground/40 border-0 border-b pb-2 focus:outline-none',
                'font-heading',
                errors.title ? 'border-destructive' : 'border-border focus:border-brand-primary',
              ].join(' ')}
            />
            {errors.title && (
              <p className="text-destructive text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Slug */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground shrink-0">
              fweezytech.com/articles/
            </span>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlug(e.target.value)
                setSlugManuallyEdited(true)
              }}
              className="bg-card text-foreground px-2 py-1 rounded border
                         border-border focus:border-brand-primary focus:outline-none
                         font-mono text-xs flex-1"
            />
          </div>

          {/* Excerpt */}
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short summary shown in search results and article cards… (max 300 chars)"
            maxLength={300}
            rows={2}
            className="w-full bg-card text-foreground placeholder-muted-foreground/40
                       rounded-lg px-3 py-2 border border-border
                       focus:border-brand-primary focus:outline-none resize-none text-sm"
          />
          <div className="text-xs text-muted-foreground/60 text-right -mt-2">
            {excerpt.length}/300
          </div>

          {/* Rich text editor */}
          <TiptapEditor
            content={bodyJson}
            onChange={(json, html) => {
              setBodyJson(json)
              setBodyHtml(html)
            }}
            onEditorReady={setEditor}
            placeholder="Start writing your article…"
            minHeight={500}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Actions */}
          <div className="bg-card rounded-lg p-4 space-y-3 border-2 border-border">
            <button
              onClick={() => handleSave('draft')}
              disabled={!canSave || isSaving}
              className="w-full py-2 px-4 rounded-lg border border-border
                         text-foreground hover:border-brand-primary hover:text-foreground
                         transition-colors text-sm font-medium disabled:opacity-40"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={!canSave || isSaving}
              className="w-full py-2 px-4 rounded-lg bg-brand-primary text-white
                         hover:bg-brand-primary/80 transition-colors text-sm font-medium
                         disabled:opacity-40"
            >
              Publish
            </button>
            {articleId && (
              <a
                href={`/articles/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-muted-foreground hover:text-brand-primary"
              >
                Preview on site ↗
              </a>
            )}
            <p className="text-xs text-muted-foreground/60 text-center">
              Cmd+S to save draft
            </p>
          </div>

          {/* Status */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'published')}
              className="w-full bg-muted text-foreground rounded px-3 py-2 text-sm
                         border border-border focus:border-brand-primary focus:outline-none"
            >
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
            </select>
          </div>

          {/* Category */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-muted text-foreground rounded px-3 py-2 text-sm
                         border border-border focus:border-brand-primary focus:outline-none"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Featured Image */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              Featured Image
            </label>
            <input
              type="url"
              value={featuredImage}
              onChange={e => setFeaturedImage(e.target.value)}
              placeholder="Paste image URL…"
              className="w-full bg-muted text-foreground rounded px-3 py-2 text-sm
                          border border-border focus:border-brand-primary focus:outline-none"
            />
            <input
              ref={featuredFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={handleFeaturedUpload}
            />
            <button
              type="button"
              onClick={() => featuredFileRef.current?.click()}
              disabled={featuredUploading}
              className="mt-2 w-full py-1.5 px-3 rounded-lg border border-dashed border-border
                         text-xs text-muted-foreground hover:text-foreground hover:border-brand-primary
                         transition-colors disabled:opacity-40"
            >
              {featuredUploading ? 'Uploading…' : '⬆ Upload image'}
            </button>
            {featuredImage && (
              <img
                src={featuredImage}
                alt="Preview"
                className="mt-2 rounded w-full h-24 object-cover"
                onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            )}
          </div>

          {/* Images library */}
            <ArticleImagesPanel
              onInsert={(url) => editor?.chain().focus().setImage({ src: url }).run()}
              onSetFeatured={(url) => setFeaturedImage(url)}
              featuredImage={featuredImage}
            />

          {/* Tags */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <label className="block text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="samsung, android, flagship…"
              className="w-full bg-muted text-foreground rounded px-3 py-2 text-sm
                         border border-border focus:border-brand-primary focus:outline-none"
            />
            <p className="text-xs text-muted-foreground/60 mt-1">Comma-separated</p>
          </div>

          {/* SEO (collapsible) */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full px-4 py-3 text-left text-xs text-muted-foreground
                         uppercase tracking-wider flex justify-between items-center
                         hover:text-foreground"
            >
              🔍 SEO
              <span>{seoOpen ? '▲' : '▼'}</span>
            </button>
            {seoOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground/60 mb-1">
                    Meta Title (default: article title)
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                    className="w-full bg-muted text-foreground rounded px-3 py-2
                               text-sm border border-border focus:outline-none
                               focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground/60 mb-1">
                    Meta Description (default: excerpt)
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={e => setSeoDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-muted text-foreground rounded px-3 py-2
                               text-sm border border-border focus:outline-none
                               focus:border-brand-primary resize-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <UnsavedChangesModal
        isOpen={showModal}
        onSave={() => {
          handleSave('draft')
          handleCancel()
        }}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />
    </div>
  )
}