/**
 * Typed non-secret configuration registry (Pillar 3).
 *
 * These values live in the `app_config` table (JSONB) and are managed from the
 * admin Settings console. Each entry declares its value type and server-side
 * validation so the UI can render the right control and the API can reject
 * bad values before they touch the DB.
 */

export type ConfigType = 'boolean' | 'string' | 'number' | 'url'
export type ConfigCategory = 'analytics' | 'features' | 'seo' | 'social' | 'search'

export interface ConfigDef {
  key: string
  label: string
  category: ConfigCategory
  type: ConfigType
  description: string
  default: string | boolean | number
  /** Optional validator for string/url values. */
  validate?: (v: string) => string | null
}

const isUrl = (v: string): string | null => {
  try {
    const u = new URL(v)
    if (!/^https?:$/.test(u.protocol)) return 'Must be an http(s) URL'
    return null
  } catch {
    return 'Must be a valid URL'
  }
}

export const CONFIG_REGISTRY: ConfigDef[] = [
  // ── Analytics ────────────────────────────────────────────────────────────
  {
    key: 'analytics_tracking_enabled',
    label: 'Tracking enabled',
    category: 'analytics',
    type: 'boolean',
    description: 'Master switch for the page-view beacon and analytics collection.',
    default: true,
  },
  {
    key: 'analytics_retention_days',
    label: 'Retention (days)',
    category: 'analytics',
    type: 'number',
    description: 'How long raw page_views / affiliate_clicks are kept.',
    default: 90,
  },

  // ── Feature flags ────────────────────────────────────────────────────────
  {
    key: 'features_chat_enabled',
    label: 'Chat assistant enabled',
    category: 'features',
    type: 'boolean',
    description: 'Show the public AI chat bubble on the site.',
    default: true,
  },
  {
    key: 'features_compare_enabled',
    label: 'Compare enabled',
    category: 'features',
    type: 'boolean',
    description: 'Allow users to add devices to the comparison tray.',
    default: true,
  },
  {
    key: 'features_coming_soon_enabled',
    label: 'Coming soon enabled',
    category: 'features',
    type: 'boolean',
    description: 'Show the coming-soon section and notify-me widgets.',
    default: true,
  },
  {
    key: 'features_ai_assistant_enabled',
    label: 'Admin AI assistant enabled',
    category: 'features',
    type: 'boolean',
    description: 'Show the AI co-pilot in the admin dashboard.',
    default: true,
  },

  // ── SEO ──────────────────────────────────────────────────────────────────
  {
    key: 'seo_site_url',
    label: 'Canonical site URL',
    category: 'seo',
    type: 'url',
    description: 'Used for canonical URLs and sitemap generation.',
    default: 'https://fweezytech.com',
    validate: isUrl,
  },
  {
    key: 'seo_default_description',
    label: 'Default meta description',
    category: 'seo',
    type: 'string',
    description: 'Fallback meta description when a page has none.',
    default: 'FweezyTech — phone reviews, comparisons, and buying guides.',
  },
  {
    key: 'seo_og_image',
    label: 'Default OG image URL',
    category: 'seo',
    type: 'url',
    description: 'Fallback Open Graph image for social shares.',
    default: '',
    validate: isUrl,
  },

  // ── Social ───────────────────────────────────────────────────────────────
  {
    key: 'social_youtube',
    label: 'YouTube channel URL',
    category: 'social',
    type: 'url',
    description: 'Primary YouTube channel link used across the site.',
    default: 'https://youtube.com/@fweezytech',
    validate: isUrl,
  },
  {
    key: 'social_tiktok',
    label: 'TikTok URL',
    category: 'social',
    type: 'url',
    description: 'Primary TikTok profile link.',
    default: '',
    validate: isUrl,
  },
  {
    key: 'social_instagram',
    label: 'Instagram URL',
    category: 'social',
    type: 'url',
    description: 'Primary Instagram profile link.',
    default: '',
    validate: isUrl,
  },

  // ── Search ───────────────────────────────────────────────────────────────
  {
    key: 'search_include_advertise',
    label: 'Index /advertise page',
    category: 'search',
    type: 'boolean',
    description: 'Allow the /advertise page to be indexed by search engines.',
    default: false,
  },
]

export function getConfigDef(key: string): ConfigDef | undefined {
  return CONFIG_REGISTRY.find((c) => c.key === key)
}

export function defaultConfigMap(): Record<string, string | boolean | number> {
  return Object.fromEntries(CONFIG_REGISTRY.map((c) => [c.key, c.default]))
}