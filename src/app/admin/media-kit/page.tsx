'use client'
import { useEffect, useState, useCallback } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'

type MediaKit = {
  id: number
  short_bio: string | null
  long_bio: string | null
  total_followers: string | null
  total_views: string | null
  years_active: number | null
  youtube_followers: string | null
  tiktok_followers: string | null
  instagram_followers: string | null
  facebook_followers: string | null
  logo_light_url: string | null
  logo_dark_url: string | null
  logo_svg_light_url: string | null
  logo_svg_dark_url: string | null
  headshots: Array<{ url: string; label?: string }>
  brand_colours: Array<{ name: string; hex: string; rgb?: string; cmyk?: string }>
  active: boolean
  updated_at: string
}

export default function MediaKitPage() {
  const [data, setData] = useState<MediaKit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const [form, setForm] = useState({
    short_bio: '',
    long_bio: '',
    total_followers: '',
    total_views: '',
    years_active: '',
    youtube_followers: '',
    tiktok_followers: '',
    instagram_followers: '',
    facebook_followers: '',
    logo_light_url: '',
    logo_dark_url: '',
    logo_svg_light_url: '',
    logo_svg_dark_url: '',
    headshots: [] as Array<{ url: string; label?: string }>,
    brand_colours: [] as Array<{ name: string; hex: string; rgb?: string; cmyk?: string }>,
    active: true,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/media-kit')
      if (res.ok) {
        const json = await res.json()
        const d = json.data
        if (d) {
          setData(d)
          setForm({
            short_bio: d.short_bio ?? '',
            long_bio: d.long_bio ?? '',
            total_followers: d.total_followers ?? '',
            total_views: d.total_views ?? '',
            years_active: d.years_active ? String(d.years_active) : '',
            youtube_followers: d.youtube_followers ?? '',
            tiktok_followers: d.tiktok_followers ?? '',
            instagram_followers: d.instagram_followers ?? '',
            facebook_followers: d.facebook_followers ?? '',
            logo_light_url: d.logo_light_url ?? '',
            logo_dark_url: d.logo_dark_url ?? '',
            logo_svg_light_url: d.logo_svg_light_url ?? '',
            logo_svg_dark_url: d.logo_svg_dark_url ?? '',
            headshots: d.headshots ?? [],
            brand_colours: d.brand_colours ?? [],
            active: d.active ?? true,
          })
        }
      }
    } catch (e) {
      console.error('Failed to fetch media kit:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/media-kit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          years_active: form.years_active ? parseInt(form.years_active) : null,
        }),
      })

      if (res.ok) {
        setToast({ message: 'Media kit saved', type: 'success' })
        resetDirty()
        fetchData()
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

  const addHeadshot = () => {
    setForm(prev => ({
      ...prev,
      headshots: [...prev.headshots, { url: '', label: '' }],
    }))
    setDirty(true)
  }

  const updateHeadshot = (index: number, field: 'url' | 'label', value: string) => {
    setForm(prev => {
      const next = { ...prev, headshots: [...prev.headshots] }
      next.headshots[index] = { ...next.headshots[index], [field]: value }
      return next
    })
    setDirty(true)
  }

  const removeHeadshot = (index: number) => {
    setForm(prev => ({
      ...prev,
      headshots: prev.headshots.filter((_, i) => i !== index),
    }))
    setDirty(true)
  }

  const addColour = () => {
    setForm(prev => ({
      ...prev,
      brand_colours: [...prev.brand_colours, { name: '', hex: '', rgb: '', cmyk: '' }],
    }))
    setDirty(true)
  }

  const updateColour = (index: number, field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, brand_colours: [...prev.brand_colours] }
      next.brand_colours[index] = { ...next.brand_colours[index], [field]: value }
      return next
    })
    setDirty(true)
  }

  const removeColour = (index: number) => {
    setForm(prev => ({
      ...prev,
      brand_colours: prev.brand_colours.filter((_, i) => i !== index),
    }))
    setDirty(true)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-card rounded w-64" />
        <div className="h-96 bg-card rounded-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <UnsavedChangesModal
        isOpen={showModal}
        onSave={() => {
          handleSave()
          handleCancel()
        }}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Media Kit</h1>
          {data && (
            <p className="text-xs text-gray-500 mt-1">Last updated {new Date(data.updated_at).toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium disabled:opacity-40"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="space-y-6">
        <section className="bg-card rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Bios</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Short Bio (max 100 words)</label>
              <textarea
                value={form.short_bio}
                onChange={e => { setForm(prev => ({ ...prev, short_bio: e.target.value })); setDirty(true) }}
                rows={3}
                maxLength={600}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{form.short_bio.split(/\s+/).filter(Boolean).length} words</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Long Bio (max 300 words)</label>
              <textarea
                value={form.long_bio}
                onChange={e => { setForm(prev => ({ ...prev, long_bio: e.target.value })); setDirty(true) }}
                rows={6}
                maxLength={1800}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{form.long_bio.split(/\s+/).filter(Boolean).length} words</p>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Followers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">YouTube</label>
              <input
                type="text"
                value={form.youtube_followers}
                onChange={e => { setForm(prev => ({ ...prev, youtube_followers: e.target.value })); setDirty(true) }}
                placeholder="150K+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">TikTok</label>
              <input
                type="text"
                value={form.tiktok_followers}
                onChange={e => { setForm(prev => ({ ...prev, tiktok_followers: e.target.value })); setDirty(true) }}
                placeholder="200K+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Instagram</label>
              <input
                type="text"
                value={form.instagram_followers}
                onChange={e => { setForm(prev => ({ ...prev, instagram_followers: e.target.value })); setDirty(true) }}
                placeholder="100K+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Facebook</label>
              <input
                type="text"
                value={form.facebook_followers}
                onChange={e => { setForm(prev => ({ ...prev, facebook_followers: e.target.value })); setDirty(true) }}
                placeholder="50K+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Followers</label>
              <input
                type="text"
                value={form.total_followers}
                onChange={e => { setForm(prev => ({ ...prev, total_followers: e.target.value })); setDirty(true) }}
                placeholder="500K+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total Views</label>
              <input
                type="text"
                value={form.total_views}
                onChange={e => { setForm(prev => ({ ...prev, total_views: e.target.value })); setDirty(true) }}
                placeholder="50M+"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Years Active</label>
            <input
              type="number"
              value={form.years_active}
                onChange={e => { setForm(prev => ({ ...prev, years_active: e.target.value })); setDirty(true) }}
              className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
            />
          </div>
        </section>

        <section className="bg-card rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Logos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo Light (PNG)</label>
              <input
                type="url"
                value={form.logo_light_url}
                onChange={e => { setForm(prev => ({ ...prev, logo_light_url: e.target.value })); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo Dark (PNG)</label>
              <input
                type="url"
                value={form.logo_dark_url}
                onChange={e => { setForm(prev => ({ ...prev, logo_dark_url: e.target.value })); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo Light (SVG)</label>
              <input
                type="url"
                value={form.logo_svg_light_url}
                onChange={e => { setForm(prev => ({ ...prev, logo_svg_light_url: e.target.value })); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo Dark (SVG)</label>
              <input
                type="url"
                value={form.logo_svg_dark_url}
                onChange={e => { setForm(prev => ({ ...prev, logo_svg_dark_url: e.target.value })); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="bg-card rounded-lg border-2 border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Headshots</h2>
            <button
              type="button"
              onClick={addHeadshot}
              className="text-sm text-brand-primary hover:text-blue-400"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {form.headshots.map((hs, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={hs.url}
                  onChange={e => updateHeadshot(i, 'url', e.target.value)}
                  placeholder="Image URL"
                  className="flex-1 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={hs.label ?? ''}
                  onChange={e => updateHeadshot(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="w-40 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeHeadshot(i)}
                  className="px-3 py-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {form.headshots.length === 0 && (
              <p className="text-sm text-gray-500">No headshots added</p>
            )}
          </div>
        </section>

        <section className="bg-card rounded-lg border-2 border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Brand Colours</h2>
            <button
              type="button"
              onClick={addColour}
              className="text-sm text-brand-primary hover:text-blue-400"
            >
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {form.brand_colours.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={c.name}
                  onChange={e => updateColour(i, 'name', e.target.value)}
                  placeholder="Name"
                  className="w-32 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={c.hex}
                  onChange={e => updateColour(i, 'hex', e.target.value)}
                  placeholder="#0066FF"
                  className="w-24 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={c.rgb ?? ''}
                  onChange={e => updateColour(i, 'rgb', e.target.value)}
                  placeholder="RGB"
                  className="w-28 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={c.cmyk ?? ''}
                  onChange={e => updateColour(i, 'cmyk', e.target.value)}
                  placeholder="CMYK"
                  className="w-28 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeColour(i)}
                  className="px-3 py-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {form.brand_colours.length === 0 && (
              <p className="text-sm text-gray-500">No brand colours added</p>
            )}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-lg
                       hover:bg-brand-primary/80 transition-colors text-sm font-medium disabled:opacity-40"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Media Kit'}
          </button>
        </div>
      </div>
    </div>
  )
}
