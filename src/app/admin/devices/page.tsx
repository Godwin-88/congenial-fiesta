'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import Image from 'next/image'

type Device = {
  id: number
  name: string
  slug: string
  brand_id: number | null
  release_year: number | null
  category: string | null
  scores_overall: number | null
  status: string
  brand?: { name: string; logo_url: string | null } | null
}

type Brand = {
  id: number
  name: string
  slug: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [brandFilter, setBrandFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (brandFilter) params.set('brand', brandFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/devices?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setDevices(data.data ?? [])
        setTotal(data.total ?? 0)
      }
    } catch (e) {
      console.error('Failed to fetch devices:', e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, brandFilter, page, limit, search])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch('/api/admin/brands')
        if (res.ok) {
          const data = await res.json()
          setBrands(data.data ?? [])
        }
      } catch (e) {
        console.error('Failed to fetch brands:', e)
      }
    }
    loadBrands()
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const totalPages = Math.ceil(total / limit)

  const filteredDevices = useMemo(() => {
    if (!search.trim()) return devices
    const q = search.toLowerCase()
    return devices.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.brand?.name?.toLowerCase().includes(q) ||
      d.slug.toLowerCase().includes(q)
    )
  }, [devices, search])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/devices/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== deleteId))
        setTotal(prev => prev - 1)
        setToast({ message: 'Device deleted', type: 'success' })
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

  const scoreBadgeColor = (score: number | null) => {
    if (!score) return 'text-gray-500 border-gray-600'
    if (score >= 80) return 'text-score-high border-score-high'
    if (score >= 60) return 'text-score-mid border-score-mid'
    return 'text-score-low border-score-low'
  }

  return (
    <div className="max-w-7xl mx-auto">
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
        <h1 className="text-2xl font-bold text-white font-heading">Devices</h1>
        <a
          href="/admin/devices/create"
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Device
        </a>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search devices…"
              className="w-full bg-muted text-white rounded pl-9 pr-3 py-2 text-sm
                         border border-border focus:border-brand-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}
            className="bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <select
            value={brandFilter}
            onChange={e => { setBrandFilter(e.target.value); setPage(1) }}
            className="bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Image</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Brand</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Score</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151]">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8">
                    <div className="space-y-3 animate-pulse">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-6 bg-muted rounded" />)}
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No devices found
                  </td>
                </tr>
              )}
              {!loading && filteredDevices.map(device => (
                <tr key={device.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs text-gray-500">
                      {device.brand?.logo_url ? (
                        <Image src={device.brand.logo_url} alt={device.name} width={40} height={40} className="object-contain rounded" />
                      ) : (
                        device.name[0]
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{device.name}</td>
                  <td className="px-4 py-3 text-gray-400">{device.brand?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{device.category ?? '—'}</td>
                  <td className="px-4 py-3">
                    {device.scores_overall ? (
                      <span className={`inline-flex items-center justify-center rounded-full border-2 font-bold text-sm px-2 py-0.5 ${scoreBadgeColor(device.scores_overall)}`}>
                        {device.scores_overall}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      device.status === 'published'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{device.release_year ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/admin/devices/${device.id}/edit`}
                        className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#374151]"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => { setDeleteId(device.id); setDeleteName(device.name) }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-border rounded text-gray-400 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm font-medium ${
                p === page
                  ? 'bg-brand-primary text-white'
                  : 'border border-border text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded text-gray-400 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Device</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete &ldquo;{deleteName}&rdquo;? This cannot be undone.
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
