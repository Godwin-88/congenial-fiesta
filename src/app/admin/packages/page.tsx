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

type Package = {
  id: number
  name: string
  tier: 'starter' | 'pro' | 'premium'
  description: string
  deliverables: string[]
  highlighted: boolean
  display_order: number
}

const TIERS = [
  { value: 'starter', label: 'Starter', color: 'bg-gray-500/20 text-gray-400' },
  { value: 'pro', label: 'Pro', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'premium', label: 'Premium', color: 'bg-amber-500/20 text-amber-400' },
]

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const [formName, setFormName] = useState('')
  const [formTier, setFormTier] = useState('starter')
  const [formDescription, setFormDescription] = useState('')
  const [formDeliverables, setFormDeliverables] = useState<string[]>([])
  const [formHighlighted, setFormHighlighted] = useState(false)
  const [formDisplayOrder, setFormDisplayOrder] = useState('0')

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/packages')
      if (res.ok) {
        const data = await res.json()
        setPackages(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch packages:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPackages() }, [fetchPackages])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingPackage(null)
    setFormName('')
    setFormTier('starter')
    setFormDescription('')
    setFormDeliverables([])
    setFormHighlighted(false)
    setFormDisplayOrder('0')
    resetDirty()
    setDialogOpen(true)
  }

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormName(pkg.name)
    setFormTier(pkg.tier)
    setFormDescription(pkg.description)
    setFormDeliverables([...pkg.deliverables])
    setFormHighlighted(pkg.highlighted)
    setFormDisplayOrder(String(pkg.display_order))
    resetDirty()
    setDialogOpen(true)
  }

  const addDeliverable = () => {
    setFormDeliverables(prev => [...prev, ''])
  }

  const updateDeliverable = (index: number, value: string) => {
    setFormDeliverables(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const removeDeliverable = (index: number) => {
    setFormDeliverables(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!formName.trim() || !formDescription.trim()) {
      setToast({ message: 'Name and description are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        tier: formTier,
        description: formDescription.trim(),
        deliverables: formDeliverables.filter(d => d.trim()),
        highlighted: formHighlighted,
        display_order: parseInt(formDisplayOrder) || 0,
      }

      const url = editingPackage ? `/api/admin/packages/${editingPackage.id}` : '/api/admin/packages'
      const method = editingPackage ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingPackage ? 'Package updated' : 'Package created', type: 'success' })
        resetDirty()
        setDialogOpen(false)
        fetchPackages()
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
      const res = await fetch(`/api/admin/packages/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setPackages(prev => prev.filter(p => p.id !== deleteId))
        setToast({ message: 'Package deleted', type: 'success' })
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

  const tierColor = (tier: string) => TIERS.find(t => t.value === tier)?.color ?? 'bg-gray-500/20 text-gray-400'

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
        <h1 className="text-2xl font-bold text-white font-heading">Sponsorship Packages</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Package
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Tier</th>
                <th className="text-left px-4 py-3 font-medium">Highlighted</th>
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && packages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No packages yet
                  </td>
                </tr>
              )}
              {!loading && packages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{pkg.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColor(pkg.tier)}`}>
                      {pkg.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/packages/${pkg.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ highlighted: !pkg.highlighted }),
                        })
                        if (res.ok) fetchPackages()
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        pkg.highlighted
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {pkg.highlighted ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{pkg.display_order}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(pkg)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(pkg.id); setDeleteName(pkg.name) }}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Edit Package' : 'Add Package'}</DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Update sponsorship package details.' : 'Create a new sponsorship package.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => { setFormName(e.target.value); setDirty(true) }}
                placeholder="Package name"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tier</label>
              <select
                value={formTier}
                onChange={e => { setFormTier(e.target.value); setDirty(true) }}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              >
                {TIERS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <textarea
                value={formDescription}
                onChange={e => { setFormDescription(e.target.value); setDirty(true) }}
                rows={3}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-gray-500">Deliverables</label>
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="text-xs text-brand-primary hover:text-blue-400"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {formDeliverables.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={d}
                      onChange={e => { updateDeliverable(i, e.target.value); setDirty(true) }}
                      placeholder="Deliverable"
                      className="flex-1 bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeDeliverable(i)}
                      className="px-3 py-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formDisplayOrder}
                  onChange={e => { setFormDisplayOrder(e.target.value); setDirty(true) }}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="highlighted"
                    checked={formHighlighted}
                    onChange={e => { setFormHighlighted(e.target.checked); setDirty(true) }}
                    className="rounded border-border bg-muted"
                  />
                  <label htmlFor="highlighted" className="text-sm text-gray-400 cursor-pointer">Highlighted</label>
                </div>
              </div>
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
            <h3 className="text-lg font-semibold text-white mb-2">Delete Package</h3>
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
