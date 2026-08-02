'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'

type Sponsor = {
  id: number
  company_name: string
  logo_url: string | null
  website: string | null
  associated_video: string | null
  partnership_type: string | null
  display_order: number
  active: boolean
}

const PARTNERSHIP_TYPES = [
  { value: 'shoutout', label: 'Shoutout' },
  { value: 'dedicated-video', label: 'Dedicated Video' },
  { value: 'full-campaign', label: 'Full Campaign' },
  { value: 'product-seeding', label: 'Product Seeding' },
]

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const [formCompanyName, setFormCompanyName] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formWebsite, setFormWebsite] = useState('')
  const [formAssociatedVideo, setFormAssociatedVideo] = useState('')
  const [formPartnershipType, setFormPartnershipType] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState('0')
  const [formActive, setFormActive] = useState(true)

  const fetchSponsors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sponsors')
      if (res.ok) {
        const data = await res.json()
        setSponsors(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch sponsors:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSponsors() }, [fetchSponsors])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingSponsor(null)
    setFormCompanyName('')
    setFormLogoUrl('')
    setFormWebsite('')
    setFormAssociatedVideo('')
    setFormPartnershipType('')
    setFormDisplayOrder('0')
    setFormActive(true)
    resetDirty()
    setDialogOpen(true)
  }

  const openEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor)
    setFormCompanyName(sponsor.company_name)
    setFormLogoUrl(sponsor.logo_url ?? '')
    setFormWebsite(sponsor.website ?? '')
    setFormAssociatedVideo(sponsor.associated_video ?? '')
    setFormPartnershipType(sponsor.partnership_type ?? '')
    setFormDisplayOrder(String(sponsor.display_order))
    setFormActive(sponsor.active)
    resetDirty()
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formCompanyName.trim()) {
      setToast({ message: 'Company name is required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_name: formCompanyName.trim(),
        logo_url: formLogoUrl.trim() || null,
        website: formWebsite.trim() || null,
        associated_video: formAssociatedVideo.trim() || null,
        partnership_type: formPartnershipType || null,
        display_order: parseInt(formDisplayOrder) || 0,
        active: formActive,
      }

      const url = editingSponsor ? `/api/admin/sponsors/${editingSponsor.id}` : '/api/admin/sponsors'
      const method = editingSponsor ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingSponsor ? 'Sponsor updated' : 'Sponsor created', type: 'success' })
        resetDirty()
        setDialogOpen(false)
        fetchSponsors()
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
      const res = await fetch(`/api/admin/sponsors/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setSponsors(prev => prev.filter(s => s.id !== deleteId))
        setToast({ message: 'Sponsor deleted', type: 'success' })
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

  const toggleActive = async (sponsor: Sponsor) => {
    try {
      const res = await fetch(`/api/admin/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !sponsor.active }),
      })
      if (res.ok) fetchSponsors()
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
        <h1 className="text-2xl font-bold text-white font-heading">Sponsors</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Sponsor
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Logo</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Order</th>
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
              {!loading && sponsors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No sponsors yet
                  </td>
                </tr>
              )}
              {!loading && sponsors.map(sponsor => (
                <tr key={sponsor.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    {sponsor.logo_url ? (
                      <img src={sponsor.logo_url} alt={sponsor.company_name} className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-gray-500">
                        {sponsor.company_name[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{sponsor.company_name}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {PARTNERSHIP_TYPES.find(t => t.value === sponsor.partnership_type)?.label ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{sponsor.display_order}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(sponsor)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        sponsor.active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {sponsor.active ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(sponsor)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(sponsor.id); setDeleteName(sponsor.company_name) }}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          if (isDirty) {
            setDirty(true)
            return
          }
          setDialogOpen(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}</DialogTitle>
            <DialogDescription>
              {editingSponsor ? 'Update sponsor details below.' : 'Add a new brand partner.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company Name</label>
              <input
                type="text"
                value={formCompanyName}
                onChange={e => { setFormCompanyName(e.target.value); setDirty(true) }}
                placeholder="Company name"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
              <input
                type="url"
                value={formLogoUrl}
                onChange={e => { setFormLogoUrl(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Website</label>
              <input
                type="url"
                value={formWebsite}
                onChange={e => { setFormWebsite(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Associated Video</label>
              <input
                type="text"
                value={formAssociatedVideo}
                onChange={e => { setFormAssociatedVideo(e.target.value); setDirty(true) }}
                placeholder="YouTube video ID"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Partnership Type</label>
              <select
                value={formPartnershipType}
                onChange={e => { setFormPartnershipType(e.target.value); setDirty(true) }}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              >
                <option value="">None</option>
                {PARTNERSHIP_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Display Order</label>
              <input
                type="number"
                value={formDisplayOrder}
                onChange={e => { setFormDisplayOrder(e.target.value); setDirty(true) }}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formActive}
                onChange={e => { setFormActive(e.target.checked); setDirty(true) }}
                className="rounded border-border bg-muted"
              />
              <label htmlFor="active" className="text-sm text-gray-400 cursor-pointer">Active</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                if (isDirty) {
                  setDirty(true)
                  return
                }
                setDialogOpen(false)
              }}
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

      <UnsavedChangesModal
        isOpen={showModal}
        onSave={() => {
          handleSave()
          handleCancel()
        }}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Sponsor</h3>
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
