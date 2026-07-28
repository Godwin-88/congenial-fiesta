'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type Video = {
  id: number
  title: string
  platform: string
  embed_id: string
  thumbnail_url: string | null
  view_count: number
  duration: string | null
  associated_device_id: number | null
  published_at: string | null
  featured: boolean
}

type DeviceOption = {
  id: number
  name: string
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formPlatform, setFormPlatform] = useState('youtube')
  const [formEmbedId, setFormEmbedId] = useState('')
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('')
  const [formViewCount, setFormViewCount] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formDeviceId, setFormDeviceId] = useState('')
  const [formPublishedAt, setFormPublishedAt] = useState('')
  const [formFeatured, setFormFeatured] = useState(false)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/videos')
      if (res.ok) {
        const data = await res.json()
        setVideos(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch videos:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/devices?limit=100')
      if (res.ok) {
        const data = await res.json()
        setDevices((data.data ?? []).map((d: { id: number; name: string }) => ({ id: d.id, name: d.name })))
      }
    } catch (e) {
      console.error('Failed to fetch devices:', e)
    }
  }, [])

  useEffect(() => { fetchVideos() }, [fetchVideos])
  useEffect(() => { fetchDevices() }, [fetchDevices])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingVideo(null)
    setFormTitle('')
    setFormPlatform('youtube')
    setFormEmbedId('')
    setFormThumbnailUrl('')
    setFormViewCount('')
    setFormDuration('')
    setFormDeviceId('')
    setFormPublishedAt('')
    setFormFeatured(false)
    setDialogOpen(true)
  }

  const openEdit = (video: Video) => {
    setEditingVideo(video)
    setFormTitle(video.title)
    setFormPlatform(video.platform)
    setFormEmbedId(video.embed_id)
    setFormThumbnailUrl(video.thumbnail_url ?? '')
    setFormViewCount(String(video.view_count ?? 0))
    setFormDuration(video.duration ?? '')
    setFormDeviceId(video.associated_device_id ? String(video.associated_device_id) : '')
    setFormPublishedAt(video.published_at ? video.published_at.slice(0, 16) : '')
    setFormFeatured(video.featured)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formEmbedId.trim()) {
      setToast({ message: 'Title and embed ID are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        platform: formPlatform,
        embed_id: formEmbedId.trim(),
        thumbnail_url: formThumbnailUrl.trim() || null,
        view_count: parseInt(formViewCount) || 0,
        duration: formDuration.trim() || null,
        associated_device_id: formDeviceId ? parseInt(formDeviceId) : null,
        published_at: formPublishedAt || null,
        featured: formFeatured,
      }

      const url = editingVideo ? `/api/admin/videos/${editingVideo.id}` : '/api/admin/videos'
      const method = editingVideo ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingVideo ? 'Video updated' : 'Video created', type: 'success' })
        setDialogOpen(false)
        fetchVideos()
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Save failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/videos/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== deleteId))
        setToast({ message: 'Video deleted', type: 'success' })
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Delete failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setDeleteId(null)
      setDeleteTitle('')
    }
  }

  const platformLabel = (p: string) => p.charAt(0).toUpperCase() + p.slice(1)

  return (
    <div className="max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Videos</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Video
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Thumbnail</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Views</th>
                <th className="text-left px-4 py-3 font-medium">Featured</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && videos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No videos yet
                  </td>
                </tr>
              )}
              {!loading && videos.map(video => (
                <tr key={video.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="w-20 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-20 h-12 bg-muted rounded flex items-center justify-center text-xs text-gray-500">
                        No thumb
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{video.title}</td>
                  <td className="px-4 py-3 text-gray-400">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#374151] text-gray-300">
                      {platformLabel(video.platform)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{video.view_count?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/videos/${video.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ featured: !video.featured }),
                        })
                        if (res.ok) fetchVideos()
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        video.featured
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {video.featured ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(video)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(video.id); setDeleteTitle(video.title) }}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#374151]"
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</DialogTitle>
            <DialogDescription>
              {editingVideo ? 'Update video details below.' : 'Add a new video to the feed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Video title"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Platform</label>
              <select
                value={formPlatform}
                onChange={e => setFormPlatform(e.target.value)}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              >
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formPlatform === 'youtube'
                  ? 'Paste YouTube video ID only (not full URL)'
                  : 'Paste full URL'}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Embed ID / URL</label>
              <input
                type="text"
                value={formEmbedId}
                onChange={e => setFormEmbedId(e.target.value)}
                placeholder={formPlatform === 'youtube' ? 'dQw4w9WgXcQ' : 'https://…'}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Thumbnail URL</label>
              <input
                type="url"
                value={formThumbnailUrl}
                onChange={e => setFormThumbnailUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">View Count</label>
                <input
                  type="number"
                  value={formViewCount}
                  onChange={e => setFormViewCount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duration</label>
                <input
                  type="text"
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  placeholder="10:24"
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Associated Device</label>
              <select
                value={formDeviceId}
                onChange={e => setFormDeviceId(e.target.value)}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              >
                <option value="">None</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Published At</label>
              <input
                type="datetime-local"
                value={formPublishedAt}
                onChange={e => setFormPublishedAt(e.target.value)}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formFeatured}
                onChange={e => setFormFeatured(e.target.checked)}
                className="rounded border-border bg-muted"
              />
              <label htmlFor="featured" className="text-sm text-gray-400 cursor-pointer">Featured</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-border rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/80 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Video</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{deleteTitle}&rdquo;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteId(null); setDeleteTitle('') }}
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
