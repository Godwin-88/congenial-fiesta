'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Bell } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type ComingSoon = {
  id: number
  device_name: string
  silhouette_url: string | null
  expected_week: string
  teaser: string | null
  notify_emails: string[]
  notify_count: number
  linked_device_id: number | null
  active: boolean
  linked_device?: { id: number; name: string; slug: string } | null
}

type DeviceOption = {
  id: number
  name: string
}

export default function ComingSoonPage() {
  const [items, setItems] = useState<ComingSoon[]>([])
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ComingSoon | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showEmails, setShowEmails] = useState<number | null>(null)

  const [formDeviceName, setFormDeviceName] = useState('')
  const [formSilhouetteUrl, setFormSilhouetteUrl] = useState('')
  const [formExpectedWeek, setFormExpectedWeek] = useState('')
  const [formTeaser, setFormTeaser] = useState('')
  const [formLinkedDeviceId, setFormLinkedDeviceId] = useState('')
  const [formActive, setFormActive] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/coming-soon')
      if (res.ok) {
        const data = await res.json()
        setItems(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch coming soon:', e)
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

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { fetchDevices() }, [fetchDevices])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingItem(null)
    setFormDeviceName('')
    setFormSilhouetteUrl('')
    setFormExpectedWeek('')
    setFormTeaser('')
    setFormLinkedDeviceId('')
    setFormActive(true)
    setDialogOpen(true)
  }

  const openEdit = (item: ComingSoon) => {
    setEditingItem(item)
    setFormDeviceName(item.device_name)
    setFormSilhouetteUrl(item.silhouette_url ?? '')
    setFormExpectedWeek(item.expected_week)
    setFormTeaser(item.teaser ?? '')
    setFormLinkedDeviceId(item.linked_device_id ? String(item.linked_device_id) : '')
    setFormActive(item.active)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formDeviceName.trim() || !formExpectedWeek.trim()) {
      setToast({ message: 'Device name and expected week are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        device_name: formDeviceName.trim(),
        silhouette_url: formSilhouetteUrl.trim() || null,
        expected_week: formExpectedWeek.trim(),
        teaser: formTeaser.trim() || null,
        linked_device_id: formLinkedDeviceId ? parseInt(formLinkedDeviceId) : null,
        active: formActive,
      }

      const url = editingItem ? `/api/admin/coming-soon/${editingItem.id}` : '/api/admin/coming-soon'
      const method = editingItem ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingItem ? 'Teaser updated' : 'Teaser created', type: 'success' })
        setDialogOpen(false)
        fetchItems()
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
      const res = await fetch(`/api/admin/coming-soon/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== deleteId))
        setToast({ message: 'Teaser deleted', type: 'success' })
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Delete failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const toggleActive = async (item: ComingSoon) => {
    try {
      const res = await fetch(`/api/admin/coming-soon/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      })
      if (res.ok) fetchItems()
    } catch {
      setToast({ message: 'Failed to toggle active', type: 'error' })
    }
  }

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
        <h1 className="text-2xl font-bold text-white font-heading">Coming Soon</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Teaser
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Device</th>
                <th className="text-left px-4 py-3 font-medium">Expected Week</th>
                <th className="text-left px-4 py-3 font-medium">Linked Device</th>
                <th className="text-left px-4 py-3 font-medium">Notify Count</th>
                <th className="text-left px-4 py-3 font-medium">Active</th>
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
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No teasers yet
                  </td>
                </tr>
              )}
              {!loading && items.map(item => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{item.device_name}</td>
                  <td className="px-4 py-3 text-gray-400">{item.expected_week}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {item.linked_device?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setShowEmails(showEmails === item.id ? null : item.id)}
                      className="flex items-center gap-1 text-gray-400 hover:text-white"
                    >
                      <Bell size={14} />
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#374151] text-gray-300">
                        {item.notify_count}
                      </span>
                    </button>
                    {showEmails === item.id && item.notify_emails.length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs text-gray-400 max-w-xs">
                        {item.notify_emails.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        item.active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {item.active ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(item.id); setDeleteName(item.device_name) }}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Teaser' : 'Add Teaser'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update coming-soon teaser details.' : 'Create a new upcoming device teaser.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Device Name</label>
              <input
                type="text"
                value={formDeviceName}
                onChange={e => setFormDeviceName(e.target.value)}
                placeholder="e.g. Samsung Galaxy S26"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Silhouette Image URL</label>
              <input
                type="url"
                value={formSilhouetteUrl}
                onChange={e => setFormSilhouetteUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Expected Week</label>
              <input
                type="text"
                value={formExpectedWeek}
                onChange={e => setFormExpectedWeek(e.target.value)}
                placeholder="February 2026"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teaser Text</label>
              <textarea
                value={formTeaser}
                onChange={e => setFormTeaser(e.target.value)}
                placeholder="Short teaser copy…"
                rows={3}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Linked Device</label>
              <select
                value={formLinkedDeviceId}
                onChange={e => setFormLinkedDeviceId(e.target.value)}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              >
                <option value="">None</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
                className="rounded border-border bg-muted"
              />
              <label htmlFor="active" className="text-sm text-gray-400 cursor-pointer">Active</label>
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
            <h3 className="text-lg font-semibold text-white mb-2">Delete Teaser</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{deleteName}&rdquo;?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteId(null); setDeleteName('') }}
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
