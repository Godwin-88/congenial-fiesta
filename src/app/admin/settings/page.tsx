'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, RefreshCw, Home, Server, KeyRound, SlidersHorizontal, SearchCheck, History, UserCog } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal'
import { useAdmin } from '@/context/AdminContext'
import { HealthOverview } from '@/components/admin/settings/HealthOverview'
import { IntegrationsPanel } from '@/components/admin/settings/IntegrationsPanel'
import { SecretsPanel } from '@/components/admin/settings/SecretsPanel'
import { GeneralPanel } from '@/components/admin/settings/GeneralPanel'
import { SearchIndexPanel } from '@/components/admin/settings/SearchIndexPanel'
import { AuditPanel } from '@/components/admin/settings/AuditPanel'
import { AccountPanel } from '@/components/admin/settings/AccountPanel'
import type { HealthProbe } from '@/lib/settings/health'

type TabId = 'overview' | 'integrations' | 'secrets' | 'account' | 'general' | 'search' | 'logs'

const TABS: { id: TabId; label: string; icon: typeof Home; ownerOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'integrations', label: 'Integrations', icon: Server },
  { id: 'secrets', label: 'Secrets & Keys', icon: KeyRound, ownerOnly: true },
  { id: 'account', label: 'Account & Security', icon: UserCog },
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'search', label: 'Search & Index', icon: SearchCheck },
  { id: 'logs', label: 'Audit Log', icon: History },
]

interface SiteSettingsRow {
  score_weight_display: number
  score_weight_performance: number
  score_weight_camera: number
  score_weight_battery: number
  score_weight_value: number
  admin_email: string | null
  advertise_page_indexed: boolean
}

export default function SettingsPage() {
  const { user, isOwner } = useAdmin()
  const [tab, setTab] = useState<TabId>('overview')
  const [settings, setSettings] = useState<SiteSettingsRow | null>(null)
  const [config, setConfig] = useState<Record<string, string | boolean | number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [health, setHealth] = useState<HealthProbe[]>([])
  const [healthLoading, setHealthLoading] = useState(false)

  const [weights, setWeights] = useState({
    display: 0.20,
    performance: 0.25,
    camera: 0.25,
    battery: 0.15,
    value: 0.15,
  })
  const [adminEmail, setAdminEmail] = useState('')
  const [advertiseIndexed, setAdvertiseIndexed] = useState(false)
  const { isDirty, setDirty, resetDirty, showModal, handleDiscard, handleCancel } = useUnsavedChanges()

  const notify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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
        if (json.config && typeof json.config === 'object') {
          setConfig(json.config)
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

const loadHealth = useCallback(async (refresh = false) => {
    setHealthLoading(true)
    try {
      const res = await fetch(`/api/admin/settings/health${refresh ? '?refresh=1' : ''}`)
      if (res.ok) {
        const json = await res.json()
        setHealth(json.probes ?? [])
      }
    } catch (e) {
      console.error('Failed to load health:', e)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'overview' || tab === 'integrations') loadHealth()
  }, [tab, loadHealth])

  const weightsSum = weights.display + weights.performance + weights.camera + weights.battery + weights.value
  const canSave = Math.abs(weightsSum - 1) <= 0.01

  const handleSave = async () => {
    if (!canSave) {
      notify('Weights must sum to 1.00', 'error')
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
          config,
        }),
      })

      if (res.ok) {
        notify('Settings saved')
        resetDirty()
        fetchSettings()
      } else {
        const data = await res.json()
        notify(data.error ?? 'Save failed', 'error')
      }
    } catch {
      notify('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReindex = async () => {
    try {
      const res = await fetch('/api/admin/reindex', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        notify(`Reindexed ${data.indexed} docs (${data.devices} devices, ${data.articles} articles, ${data.videos} videos)`)
      } else {
        notify(data.error ?? 'Reindex failed', 'error')
      }
    } catch {
      notify('Reindex network error', 'error')
    }
  }

  const updateConfig = (key: string, value: string | boolean | number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const availableTabs = isOwner ? TABS : TABS.filter(t => !t.ownerOnly)
  const activeTab = availableTabs.some(t => t.id === tab) ? tab : 'overview'

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform console — integrations, credentials, configuration & audit
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-40"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {availableTabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-primary text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {toast && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
          toast.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Panels */}
      {activeTab === 'overview' && (
        <HealthOverview probes={health} loading={healthLoading} onRefresh={() => loadHealth(true)} onTab={setTab} />
      )}
      {activeTab === 'integrations' && (
        <IntegrationsPanel probes={health} loading={healthLoading} onRefresh={() => loadHealth(true)} onTab={setTab} />
      )}
      {activeTab === 'secrets' && (
        <SecretsPanel notify={notify} />
      )}
      {activeTab === 'account' && (
        <AccountPanel notify={notify} />
      )}
      {activeTab === 'general' && (
        <GeneralPanel
          weights={weights}
          onWeight={(k, v) => { setWeights(prev => ({ ...prev, [k]: v })); setDirty(true) }}
          canSave={canSave}
          weightsSum={weightsSum}
          adminEmail={adminEmail}
          onAdminEmail={v => { setAdminEmail(v); setDirty(true) }}
          advertiseIndexed={advertiseIndexed}
          onAdvertiseIndexed={v => { setAdvertiseIndexed(v); setDirty(true) }}
          config={config}
          onConfig={updateConfig}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {activeTab === 'search' && (
        <SearchIndexPanel onReindex={handleReindex} />
      )}
      {activeTab === 'logs' && (
        <AuditPanel />
      )}

      <UnsavedChangesModal
        isOpen={showModal}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onCancel={handleCancel}
      />
    </div>
  )
}