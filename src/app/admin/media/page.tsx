'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Upload, Copy, Trash2, Search, Image as ImageIcon, X,
  ExternalLink, Check, HardDrive, Cloud, Images as ImagesIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useAdmin } from '@/context/AdminContext'
import type { MediaAsset, MediaSource } from '@/app/api/admin/media/route'

type Tab = 'all' | MediaSource

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: 'all', label: 'All images', icon: <ImagesIcon size={14} /> },
  { key: 'device-images', label: 'Device', icon: <HardDrive size={14} /> },
  { key: 'article-images', label: 'Articles', icon: <ImageIcon size={14} /> },
  { key: 'cloudflare', label: 'Cloudflare', icon: <Cloud size={14} /> },
]

const DESTINATIONS: Array<{ key: MediaSource; label: string; hint: string }> = [
  { key: 'device-images', label: 'Device Images', hint: 'Adds to a device gallery (Supabase)' },
  { key: 'article-images', label: 'Article Images', hint: 'For article featured/gallery images (Supabase)' },
  { key: 'cloudflare', label: 'Cloudflare', hint: 'CDN delivery via Cloudflare Images' },
]

const SOURCE_BADGE_STYLES: Record<MediaSource, string> = {
  'device-images': 'bg-blue-500/20 text-blue-400',
  'article-images': 'bg-emerald-500/20 text-emerald-400',
  cloudflare: 'bg-orange-500/20 text-orange-400',
}

function formatBytes(size?: number): string {
  if (!size) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

export default function MediaPage() {
  const { isAdmin, isEditor } = useAdmin()
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [destination, setDestination] = useState<MediaSource>('device-images')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setAssets(data.data ?? [])
      } else {
        setToast({ message: 'Failed to load media library', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error loading media', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Cleanup object URL for the local preview
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: assets.length, 'device-images': 0, 'article-images': 0, cloudflare: 0 }
    for (const a of assets) c[a.source] += 1
    return c
  }, [assets])

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assets.filter(a => {
      if (tab !== 'all' && a.source !== tab) return false
      if (!q) return true
      return (
        a.filename.toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q)
      )
    })
  }, [assets, tab, search])

  const selectFile = (file: File | null) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)) {
      setToast({ message: 'Unsupported file type. Use JPG, PNG, WebP, GIF, or AVIF.', type: 'error' })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: 'File must be under 10MB', type: 'error' })
      return
    }
    setSelectedFile(file)
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('destination', destination)

      const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok) {
        // Auto-copy the URL so it can be pasted straight into any device/article form.
        await navigator.clipboard.writeText(data.url).catch(() => {})
        setToast({
          message: 'Uploaded to ' + (destination === 'cloudflare' ? 'Cloudflare' : destination === 'device-images' ? 'Device Images' : 'Article Images') + ' — URL copied',
          type: 'success',
        })
        setUploadOpen(false)
        setSelectedFile(null)
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        await fetchMedia()
      } else {
        setToast({ message: data.error ?? 'Upload failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error during upload', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleCopy = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url)
      setCopiedId(asset.id)
      setToast({ message: 'URL copied', type: 'success' })
      setTimeout(() => setCopiedId(null), 1600)
    } catch {
      setToast({ message: 'Failed to copy URL', type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const isCloudflare = deleteTarget.source === 'cloudflare'
      const params = new URLSearchParams()
      params.set('source', deleteTarget.source)
      if (!isCloudflare) params.set('path', deleteTarget.path)

      const res = await fetch('/api/admin/media/' + encodeURIComponent(deleteTarget.id) + '?' + params.toString(), {
        method: 'DELETE',
      })

      if (res.ok) {
        setAssets(prev => prev.filter(a => a.id !== deleteTarget.id))
        setToast({ message: 'Image deleted', type: 'success' })
        setDeleteTarget(null)
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Delete failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error during delete', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openUpload = () => {
    setDestination('device-images')
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Media Library</h1>
          <p className="text-sm text-gray-400 mt-1">
            Every device and article image in one place. Copy a URL to use it anywhere.
          </p>
        </div>
        {isEditor && (
          <button
            type="button"
            onClick={openUpload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                       hover:bg-brand-primary/80 transition-colors text-sm font-medium shrink-0"
          >
            <Upload size={16} />
            Upload Image
          </button>
        )}
      </div>

      {/* Tabs + search */}
      <div className="bg-card rounded-lg border-2 border-border p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                  tab === t.key
                    ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/40'
                    : 'text-gray-400 border-border hover:text-white hover:bg-accent',
                ].join(' ')}
              >
                {t.icon}
                {t.label}
                <span className={`ml-0.5 text-xs rounded-full px-1.5 py-0.5 ${
                  tab === t.key ? 'bg-brand-primary/20 text-brand-primary' : 'bg-muted text-gray-400'
                }`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by filename or path…"
              className="w-full bg-muted text-white rounded pl-9 pr-3 py-2 text-sm
                         border border-border focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-card rounded-lg border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-card rounded-lg border border-border">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium text-gray-400">
            {assets.length === 0 ? 'No images found yet' : 'No images match your search'}
          </p>
          {assets.length === 0 && (
            <p className="text-sm mt-2">Upload your first image to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              className="group relative aspect-square bg-card rounded-lg border border-border overflow-hidden"
            >
              <Image
                src={asset.url}
                alt={asset.filename}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-contain p-2"
              />
              {/* Source badge */}
              <span className={`absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${SOURCE_BADGE_STYLES[asset.source]}`}>
                {asset.source === 'device-images' ? 'DEVICE' : asset.source === 'article-images' ? 'ARTICLE' : 'CLOUDFLARE'}
              </span>

              {/* Hover actions */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-8 px-3 pb-2">
                <p className="text-[11px] text-gray-200 truncate mb-1.5" title={asset.path}>
                  {asset.filename}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy(asset)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === asset.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asset)}
                      className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border-2 border-border p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Image</h3>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-accent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Destination picker */}
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Add to</p>
            <div className="grid gap-2 mb-4">
              {DESTINATIONS.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDestination(d.key)}
                  className={[
                    'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                    destination === d.key
                      ? 'bg-brand-primary/10 border-brand-primary/50 text-white'
                      : 'border-border text-gray-400 hover:text-white hover:bg-accent',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {destination === d.key && <Check size={14} className="text-brand-primary" />}
                    {d.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 ml-6">{d.hint}</div>
                </button>
              ))}
            </div>

            {/* Drag & drop / file picker */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                selectFile(e.dataTransfer.files?.[0] ?? null)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                dragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-border hover:border-brand-primary/50',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={e => selectFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile && previewUrl ? (
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatBytes(selectedFile.size)} · ready to upload
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null) }}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="mx-auto mb-2 text-gray-500" />
                  <p className="text-sm text-gray-400">
                    Drag &amp; drop an image here, or <span className="text-brand-primary">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, GIF or AVIF · max 10MB</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-primary text-white rounded-lg
                           hover:bg-brand-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && isAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border-2 border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Image</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{deleteTarget.filename}&rdquo;?
              This permanently removes it from{' '}
              {deleteTarget.source === 'cloudflare' ? 'Cloudflare Images' : ('Supabase Storage (' + deleteTarget.source + ')')}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-border rounded-lg"
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
