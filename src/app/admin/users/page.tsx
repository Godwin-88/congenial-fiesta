'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'

type AdminUser = {
  id: string
  display_name: string
  email?: string
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-red-500/20 text-red-400' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'viewer', label: 'Viewer', color: 'bg-gray-500/20 text-gray-400' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const [formEmail, setFormEmail] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formRole, setFormRole] = useState('viewer')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/auth/me').catch(() => null),
      ])

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.data ?? [])
      }

      if (meRes?.ok) {
        const meData = await meRes.json()
        setCurrentUserId(meData.user?.id ?? null)
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const openCreate = () => {
    setEditingUser(null)
    setFormEmail('')
    setFormDisplayName('')
    setFormRole('viewer')
    resetDirty()
    setDialogOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setFormEmail(user.email ?? '')
    setFormDisplayName(user.display_name)
    setFormRole(user.role)
    resetDirty()
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingUser && (!formEmail.trim() || !formDisplayName.trim())) {
      setToast({ message: 'Email and display name are required', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = editingUser
        ? { role: formRole }
        : {
            email: formEmail.trim(),
            display_name: formDisplayName.trim(),
            role: formRole,
          }

      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setToast({ message: editingUser ? 'User updated' : 'User added', type: 'success' })
        resetDirty()
        setDialogOpen(false)
        fetchUsers()
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
      const res = await fetch(`/api/admin/users/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteId))
        setToast({ message: 'User removed', type: 'success' })
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

  const roleColor = (role: string) => ROLES.find(r => r.value === role)?.color ?? 'bg-gray-500/20 text-gray-400'

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
        <h1 className="text-2xl font-bold text-white font-heading">Admin Users</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
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
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No admin users yet
                  </td>
                </tr>
              )}
              {!loading && users.map(user => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
                        {user.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit role"
                        disabled={user.id === currentUserId}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(user.id); setDeleteName(user.display_name) }}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#374151]"
                        title="Remove"
                        disabled={user.id === currentUserId}
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
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Change user role. Name and email cannot be edited here.'
                : 'Add an existing Supabase user to the CMS staff.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-lg border-2 border-border bg-background/50 p-4">
            {!editingUser && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => { setFormEmail(e.target.value); setDirty(true) }}
                    placeholder="user@example.com"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={e => { setFormDisplayName(e.target.value); setDirty(true) }}
                    placeholder="John Doe"
                    className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                value={formRole}
                onChange={e => { setFormRole(e.target.value); setDirty(true) }}
                disabled={!!editingUser && editingUser.id === currentUserId}
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none disabled:opacity-50"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {editingUser && editingUser.id === currentUserId && (
                <p className="text-xs text-gray-500 mt-1">You cannot change your own role.</p>
              )}
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
            <h3 className="text-lg font-semibold text-white mb-2">Remove User</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to remove &ldquo;{deleteName}&rdquo; from admin users?
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
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
