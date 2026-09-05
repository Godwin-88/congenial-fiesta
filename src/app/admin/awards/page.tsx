'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Award } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'

type Award = {
  id: number
  award_name: string
  awarding_body: string
  year: number
  certificate_image: string | null
  award_url: string | null
  display_order: number
}

export default function AwardsPage() {
  const [items, setItems] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Award | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const [formAwardName, setFormAwardName] = useState('')
  const [formAwardingBody, setFormAwardingBody] = useState('')
  const [formYear, setFormYear] = useState(String(new Date().getFullYear()))
  const [formCertificateImage, setFormCertificateImage] = useState('')
  const [formAwardUrl, setFormAwardUrl] = useState('')
  const [formDisplayOrder, setFormDisplayOrder] = useState('0')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/awards')
      if (res.ok) {
        const data = await res.json()
        setItems(data.data ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch awards:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingItem(null)
    setFormAwardName('')
    setFormAwardingBody('')
    setFormYear(String(new Date().getFullYear()))
    setFormCertificateImage('')
    setFormAwardUrl('')
    setFormDisplayOrder('0')
    resetDirty()
    setDialogOpen(true)
  }

  const openEdit = (item: Award) => {
    setEditingItem(item)
    setFormAwardName(item.award_name)
    setFormAwardingBody(item.awarding_body)
    setFormYear(String(item.year))
    setFormCertificateImage(item.certificate_image ?? '')
    setFormAwardUrl(item.award_url ?? '')
    setFormDisplayOrder(String(item.display_order))
    resetDirty()
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formAwardName.trim() || !formAwardingBody.trim() || !formYear) {
      setToast({ message: 'Award name, awarding body, and year are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        award_name: formAwardName.trim(),
        awarding_body: formAwardingBody.trim(),
        year: parseInt(formYear),
        certificate_image: formCertificateImage.trim() || null,
        award_url: formAwardUrl.trim() || null,
        display_order: parseInt(formDisplayOrder) || 0,
      }

      const url = editingItem ? `/api/admin/awards/${editingItem.id}` : '/api/admin/awards'
      const method = editingItem ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingItem ? 'Award updated' : 'Award created', type: 'success' })
        resetDirty()
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
      const res = await fetch(`/api/admin/awards/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== deleteId))
        setToast({ message: 'Award deleted', type: 'success' })
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
        <h1 className="text-2xl font-bold text-white font-heading">Awards</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Award
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Award</th>
                <th className="text-left px-4 py-3 font-medium">Body</th>
                <th className="text-left px-4 py-3 font-medium">Year</th>
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
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No awards yet
                  </td>
                </tr>
              )}
              {!loading && items.map(item => (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{item.award_name}</td>
                  <td className="px-4 py-3 text-gray-400">{item.awarding_body}</td>
                  <td className="px-4 py-3 text-gray-400">{item.year}</td>
                  <td className="px-4 py-3 text-gray-400">{item.display_order}</td>
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
                        onClick={() => { setDeleteId(item.id); setDeleteName(item.award_name) }}
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
            <DialogTitle>{editingItem ? 'Edit Award' : 'Add Award'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update award details.' : 'Add a new award or recognition.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-lg border-2 border-border bg-background/50 p-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Award Name</label>
              <input
                type="text"
                value={formAwardName}
                onChange={e => { setFormAwardName(e.target.value); setDirty(true) }}
                placeholder="Award name"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Awarding Body</label>
              <input
                type="text"
                value={formAwardingBody}
                onChange={e => { setFormAwardingBody(e.target.value); setDirty(true) }}
                placeholder="Organisation name"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year</label>
              <input
                type="number"
                value={formYear}
                onChange={e => { setFormYear(e.target.value); setDirty(true) }}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Certificate Image URL</label>
              <input
                type="url"
                value={formCertificateImage}
                onChange={e => { setFormCertificateImage(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Award URL</label>
              <input
                type="url"
                value={formAwardUrl}
                onChange={e => { setFormAwardUrl(e.target.value); setDirty(true) }}
                placeholder="https://…"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
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
          <div className="bg-card rounded-lg border-2 border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Award</h3>
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
