'use client'
import { useEffect, useState, useCallback } from 'react'
import { Save, RefreshCw } from 'lucide-react'

type SiteSettings = {
  id: number
  score_weight_display: number
  score_weight_performance: number
  score_weight_camera: number
  score_weight_battery: number
  score_weight_value: number
  admin_email: string | null
  advertise_page_indexed: boolean
  updated_at: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [reindexing, setReindexing] = useState(false)

  const [weights, setWeights] = useState({
    display: 0.20,
    performance: 0.25,
    camera: 0.25,
    battery: 0.15,
    value: 0.15,
  })
  const [adminEmail, setAdminEmail] = useState('')
  const [advertiseIndexed, setAdvertiseIndexed] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const json = await res.json()
        const d = json.data
        if (d) {
          setSettings(d)
          setWeights({
            display: d.score_weight_display,
            performance: d.score_weight_performance,
            camera: d.score_weight_camera,
            battery: d.score_weight_battery,
            value: d.score_weight_value,
          })
          setAdminEmail(d.admin_email ?? '')
          setAdvertiseIndexed(d.advertise_page_indexed)
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const weightsSum = weights.display + weights.performance + weights.camera + weights.battery + weights.value
  const canSave = Math.abs(weightsSum - 1) <= 0.01

  const handleSave = async () => {
    if (!canSave) {
      setToast({ message: 'Weights must sum to 1.00', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...weights,
          admin_email: adminEmail.trim() || null,
          advertise_page_indexed: advertiseIndexed,
        }),
      })

      if (res.ok) {
        setToast({ message: 'Settings saved', type: 'success' })
        fetchSettings()
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

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const res = await fetch('/api/admin/reindex', { method: 'POST' })
      if (res.ok) {
        setToast({ message: 'Reindex started', type: 'success' })
      } else {
        const data = await res.json()
        setToast({ message: data.error ?? 'Reindex failed', type: 'error' })
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' })
    } finally {
      setReindexing(false)
    }
  }

  const updateWeight = (field: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [field]: Math.max(0, Math.min(1, value)) }))
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white font-heading">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg
                     hover:bg-brand-primary/80 transition-colors text-sm font-medium disabled:opacity-40"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="space-y-6">
        <section className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Score Weights</h2>
          <p className="text-sm text-gray-400 mb-4">
            Weights must sum to 1.00. Current sum: <span className={canSave ? 'text-green-400' : 'text-red-400'}>{weightsSum.toFixed(2)}</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">{key}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={value}
                  onChange={e => updateWeight(key as keyof typeof weights, parseFloat(e.target.value) || 0)}
                  className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@fweezytech.com"
                className="w-full bg-muted text-white rounded px-3 py-2 text-sm border border-border focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="advertise-indexed"
                checked={advertiseIndexed}
                onChange={e => setAdvertiseIndexed(e.target.checked)}
                className="rounded border-border bg-muted"
              />
              <label htmlFor="advertise-indexed" className="text-sm text-gray-400 cursor-pointer">
                Index /advertise page in search engines
              </label>
            </div>
          </div>
        </section>

        <section className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Search Index</h2>
          <p className="text-sm text-gray-400 mb-4">
            Reindex all published content (devices, articles, videos) in Upstash Search.
          </p>
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="flex items-center gap-2 px-4 py-2 bg-[#374151] text-white rounded-lg
                       hover:bg-[#4B5563] transition-colors text-sm font-medium disabled:opacity-40"
          >
            <RefreshCw size={16} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? 'Reindexing…' : 'Reindex All Content'}
          </button>
        </section>
      </div>
    </div>
  )
}
