'use client'

import { Save } from 'lucide-react'

type ConfigKey = string
type ConfigValue = string | boolean | number

interface GeneralPanelProps {
  weights: Record<string, number>
  onWeight: (key: string, value: number) => void
  canSave: boolean
  weightsSum: number
  adminEmail: string
  onAdminEmail: (v: string) => void
  advertiseIndexed: boolean
  onAdvertiseIndexed: (v: boolean) => void
  config: Record<ConfigKey, ConfigValue>
  onConfig: (key: string, value: ConfigValue) => void
  onSave: () => void
  saving: boolean
}

const WEIGHT_LABELS: Record<string, string> = {
  display: 'Display',
  performance: 'Performance',
  camera: 'Camera',
  battery: 'Battery',
  value: 'Value',
}

const FEATURE_SECTIONS: { title: string; keys: string[] }[] = [
  { title: 'Analytics', keys: ['analytics_tracking_enabled', 'analytics_retention_days'] },
  { title: 'Feature flags', keys: ['features_chat_enabled', 'features_compare_enabled', 'features_coming_soon_enabled', 'features_ai_assistant_enabled'] },
  { title: 'SEO', keys: ['seo_site_url', 'seo_default_description', 'seo_og_image'] },
  { title: 'Social', keys: ['social_youtube', 'social_tiktok', 'social_instagram'] },
  { title: 'Search', keys: ['search_include_advertise'] },
]

const KEY_LABELS: Record<string, string> = {
  analytics_tracking_enabled: 'Tracking enabled',
  analytics_retention_days: 'Retention (days)',
  features_chat_enabled: 'Chat assistant',
  features_compare_enabled: 'Compare tool',
  features_coming_soon_enabled: 'Coming soon',
  features_ai_assistant_enabled: 'AI co-pilot',
  seo_site_url: 'Canonical site URL',
  seo_default_description: 'Default meta description',
  seo_og_image: 'Default OG image URL',
  social_youtube: 'YouTube',
  social_tiktok: 'TikTok',
  social_instagram: 'Instagram',
  search_include_advertise: 'Index /advertise',
}
export function GeneralPanel({
  weights,
  onWeight,
  canSave,
  weightsSum,
  adminEmail,
  onAdminEmail,
  advertiseIndexed,
  onAdvertiseIndexed,
  config,
  onConfig,
  onSave,
  saving,
}: GeneralPanelProps) {
  return (
    <div className="space-y-6">
      {/* Score weights */}
      <section className="rounded-lg border-2 border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Score Weights</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weights must sum to 1.00. Current sum:{' '}
          <span className={`font-medium ${canSave ? 'text-emerald-500' : 'text-red-500'}`}>{weightsSum.toFixed(2)}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          {Object.entries(weights).map(([key, value]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-muted-foreground">{WEIGHT_LABELS[key] ?? key}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={value}
                onChange={e => onWeight(key, parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Contact + indexing */}
      <section className="rounded-lg border-2 border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Admin email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={e => onAdminEmail(e.target.value)}
              placeholder="admin@fweezytech.com"
              className="w-full rounded-lg px-3 py-2 text-sm border border-border bg-muted text-foreground"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={advertiseIndexed}
              onChange={e => onAdvertiseIndexed(e.target.checked)}
              className="rounded border-border bg-muted"
            />
            Index /advertise page in search engines
          </label>
        </div>
      </section>
{/* Feature flags + SEO config */}
      {FEATURE_SECTIONS.map(section => (
        <section key={section.title} className="rounded-lg border-2 border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.keys.map(key => {
              const label = KEY_LABELS[key] ?? key
              const value = config[key]
              if (typeof value === 'boolean') {
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e => onConfig(key, e.target.checked)}
                      className="rounded border-border bg-muted"
                    />
                    {label}
                  </label>
                )
              }
              return (
                <div key={key}>
                  <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                  <input
                    type={typeof value === 'number' ? 'number' : 'text'}
                    value={String(value ?? '')}
                    onChange={e => onConfig(key, typeof value === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none"
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <button
        onClick={onSave}
        disabled={saving || !canSave}
        className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-40"
      >
        <Save size={16} />
        {saving ? 'Saving…' : 'Save general settings'}
      </button>
    </div>
  )
}