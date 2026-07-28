'use client'
import { useEffect, useState, useCallback } from 'react'
import { Upload, Copy, Trash2, Search, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'

type MediaImage = {
  id: string
  filename: string
  uploaded: string
  url: string
}

export default function MediaPage() {
  const [images, setImages] = useState<MediaImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteFilename, setDeleteFilename] = useState('')

  const fetchImages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setImages(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch media:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchImages() }, [fetchImages])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setToast({ message: 'Image uploaded', type: 'success' })
        fetchImages()
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Upload failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setToast({ message: 'URL copied', type: 'success' })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/media/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setImages(prev => prev.filter(img => img.id !== deleteId))
        setToast({ message: 'Image deleted', type: 'success' })
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Delete failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setDeleteId(null)
      setDeleteFilename('')
    }
  }

  const filteredImages = images.filter(img =>
    img.filename.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Media Library</h1>
        <label className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                         hover:bg-brand-primary/80 transition-colors text-sm font-medium cursor-pointer">
          <Upload size={16} />
          {uploading ? 'Uploading…' : 'Upload Image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className="w-full bg-muted text-white rounded pl-9 pr-3 py-2 text-sm
                       border border-border focus:border-brand-primary focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>No images found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredImages.map(img => (
            <div
              key={img.id}
              className="group relative aspect-square bg-muted rounded-lg border border-border overflow-hidden"
            >
              <Image
                src={img.url}
                alt={img.filename}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-xs text-white truncate mb-1">{img.filename}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(img.url)}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
                    title="Copy URL"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteId(img.id); setDeleteFilename(img.filename) }}
                    className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Image</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{deleteFilename}&rdquo;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteId(null); setDeleteFilename('') }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
