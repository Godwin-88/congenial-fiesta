import {
  LayoutDashboard,
  Users,
  FileText,
  Smartphone,
  Scale,
  Heart,
  MousePointerClick,
  Search,
  Megaphone,
  Handshake,
  Target,
  FileDown,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

/**
 * Shared analytics tab configuration.
 * Single source of truth for the analytics submenu (client) and the page
 * (server) so the 12 sections, their labels/icons and role gating can never
 * drift apart.
 */

export type TabId =
  | 'overview'
  | 'traffic'
  | 'content'
  | 'devices'
  | 'compare'
  | 'community'
  | 'affiliate'
  | 'search'
  | 'campaigns'
  | 'outreach'
  | 'goals'
  | 'export'
  | 'explore'

export const ALL_TABS: TabId[] = [
  'overview',
  'traffic',
  'content',
  'devices',
  'compare',
  'community',
  'affiliate',
  'search',
  'campaigns',
  'outreach',
  'goals',
  'export',
  'explore',
]

export const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  traffic: 'Traffic & Audience',
  content: 'Content & SEO',
  devices: 'Devices & Catalog',
  compare: 'Compare & Consideration',
  community: 'Community & Engagement',
  affiliate: 'Affiliate & Revenue',
  search: 'Search & Discovery',
  campaigns: 'Campaigns & Acquisition',
  outreach: 'Outreach & Leads',
  goals: 'Goals & Alerts',
  export: 'Export & API',
  explore: 'Explore',
}

export const TAB_ICONS: Record<TabId, LucideIcon> = {
  overview: LayoutDashboard,
  traffic: Users,
  content: FileText,
  devices: Smartphone,
  compare: Scale,
  community: Heart,
  affiliate: MousePointerClick,
  search: Search,
  campaigns: Megaphone,
  outreach: Handshake,
  goals: Target,
  export: FileDown,
  explore: BarChart3,
}

export const ROLE_ALLOWED: Record<string, TabId[]> = {
  owner: [...ALL_TABS],
  admin: [...ALL_TABS],
  editor: ['overview', 'traffic', 'content', 'devices', 'compare', 'community'],
  viewer: ['overview', 'traffic'],
}

export function resolveActiveTab(rawTab: string | null, role: string): TabId {
  const allowed = ROLE_ALLOWED[role] ?? ROLE_ALLOWED.viewer
  return allowed.includes(rawTab as TabId) ? (rawTab as TabId) : 'overview'
}