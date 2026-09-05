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

type Brand = {
  id: number
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  featured: boolean
  device_count?: number
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formWebsite, setFormWebsite] = useState('')
  const [formFeatured, setFormFeatured] = useState(false)
  const [saving, setSaving] = useState(false)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/brands')
      if (res.ok) {
        const data = await res.json()
        setBrands(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch brands:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrands() }, [fetchBrands])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingBrand(null)
    setFormName('')
    setFormSlug('')
    setFormLogoUrl('')
    setFormWebsite('')
    setFormFeatured(false)
    resetDirty()
    setDialogOpen(true)
  }

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setFormName(brand.name)
    setFormSlug(brand.slug)
    setFormLogoUrl(brand.logo_url ?? '')
    setFormWebsite(brand.website ?? '')
    setFormFeatured(brand.featured)
    resetDirty()
    setDialogOpen(true)
  }

  const handleNameChange = (name: string) => {
    setFormName(name)
    setDirty(true)
    if (!editingBrand) {
      const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
      setFormSlug(slug)
    }
  }

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      setToast({ message: 'Name and slug are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim(),
        logo_url: formLogoUrl.trim() || null,
        website: formWebsite.trim() || null,
        featured: formFeatured,
      }

      const url = editingBrand ? `/api/admin/brands/${editingBrand.id}` : '/api/admin/brands'
      const method = editingBrand ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingBrand ? 'Brand updated' : 'Brand created', type: 'success' })
        resetDirty()
        setDialogOpen(false)
        fetchBrands()
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
      const res = await fetch(`/api/admin/brands/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setBrands(prev => prev.filter(b => b.id !== deleteId))
        setToast({ message: 'Brand deleted', type: 'success' })
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

  const toggleFeatured = async (brand: Brand) => {
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !brand.featured }),
      })
      if (res.ok) {
        setBrands(prev => prev.map(b =>
          b.id === brand.id ? { ...b, featured: !brand.featured } : b
        ))
      }
    } catch {
      setToast({ message: 'Failed to toggle featured', type: 'error' })
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Brands</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Brand
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Logo</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Featured</th>
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
              {!loading && brands.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No brands yet
                  </td>
                </tr>
              )}
              {!loading && brands.map(brand => (
                <tr key={brand.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs text-gray-500">
                        {brand.name[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{brand.name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(brand)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        brand.featured
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {brand.featured ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(brand)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(brand.id); setDeleteName(brand.name) }}
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

      {/* Create/Edit Modal */}
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
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
            <DialogDescription>
              {editingBrand ? 'Update brand details below.' : 'Create a new brand for device categorization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-lg border-2 border-border bg-background/50 p-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={formName}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Brand name"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm
                           border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={formSlug}
                onChange={e => { setFormSlug(e.target.value); setDirty(true) }}
                placeholder="brand-slug"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm
                           border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
              <input
                type="url"
                value={formLogoUrl}
                onChange={e => { setFormLogoUrl(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm
                           border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Website</label>
              <input
                type="url"
                value={formWebsite}
                onChange={e => { setFormWebsite(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm
                           border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={formFeatured}
                onChange={e => { setFormFeatured(e.target.checked); setDirty(true) }}
                className="rounded border-border bg-muted"
              />
              <label htmlFor="featured" className="text-sm text-gray-400 cursor-pointer">Featured</label>
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

      {/* Delete confirmation */}
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
          <div className="bg-card rounded-lg border-2 border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Brand</h3>
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
