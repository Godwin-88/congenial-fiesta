'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MAJOR_CATEGORIES, type MajorCategory } from '@/types/cms'

interface DeviceType {
  id: number
  slug: string
  label: string
  major_category: string
  display_order: number
}

export default function DeviceTypesPage() {
  const [types, setTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [major, setMajor] = useState(MAJOR_CATEGORIES[0].slug)
  const [displayOrder, setDisplayOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/device-types')
      if (res.ok) {
        const data = await res.json()
        setTypes(data.data ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/device-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, slug, major_category: major, display_order: displayOrder }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to add device type')
      } else {
        setLabel('')
        setSlug('')
        setDisplayOrder('0')
        await load()
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/devices" className="text-sm text-muted-foreground hover:text-foreground">
          ← Devices
        </Link>
        <h1 className="mt-1 font-heading text-2xl font-bold text-white">Device Categories</h1>
        <p className="text-sm text-gray-400">
          Manage the device types available under each major category. These power the
          category picker in the device editor and the public filter.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add form */}
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-white">Add Device Type</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Earbuds"
              className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Slug</label>
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="earbuds"
              className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Major Category</label>
            <select value={major} onChange={e => setMajor(e.target.value as MajorCategory)}
              className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none">
              {MAJOR_CATEGORIES.map(m => <option key={m.slug} value={m.slug}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display Order</label>
            <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} placeholder="0"
              className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={saving || !label.trim() || !slug.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/80 disabled:opacity-40">
            <Plus size={16} /> {saving ? 'Adding…' : 'Add Type'}
          </button>
        </form>

        {/* List */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-white">Existing Types</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              {MAJOR_CATEGORIES.map(m => {
                const items = types.filter(t => t.major_category === m.slug)
                if (items.length === 0) return null
                return (
                  <div key={m.slug}>
                    <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">{m.label}</p>
                    <ul className="space-y-1">
                      {items.map(t => (
                        <li key={t.id} className="flex items-center justify-between rounded bg-muted px-3 py-1.5 text-sm text-gray-200">
                          <span>{t.label}</span>
                          <span className="text-xs text-gray-500">{t.slug}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              {types.length === 0 && <p className="text-sm text-gray-500">No device types yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
