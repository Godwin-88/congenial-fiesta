// ── CMS Database Types (derived from Supabase Postgres schema) ──────────
// These replace payload-types.ts after Payload CMS removal.

export interface AdminUser {
  id: string
  display_name: string
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

export interface Brand {
  id: number
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  featured: boolean
  created_at: string
  updated_at: string
  device_count?: number
}

export interface Device {
  id: number
  name: string
  slug: string
  brand_id: number | null
  release_year: number | null
  category: 'flagship' | 'mid-range' | 'budget' | 'ultra-premium' | null
  price_kes: number | null
  price_usd: number | null
  tagline: string | null
  status: 'draft' | 'published'
  score_display: number | null
  score_performance: number | null
  score_camera: number | null
  score_battery: number | null
  score_value: number | null
  score_overall: number | null
  verdict_pros: string[]
  verdict_cons: string[]
  verdict_bottom_line: string | null
  verdict_full: string | null
  images: Record<string, unknown>[]
  specs_design: Record<string, unknown>
  specs_display: Record<string, unknown>
  specs_processor: Record<string, unknown>
  specs_memory: Record<string, unknown>
  specs_camera: Record<string, unknown>
  specs_battery: Record<string, unknown>
  specs_connectivity: Record<string, unknown>
  specs_software: Record<string, unknown>
  benchmark_geekbench_single: number | null
  benchmark_geekbench_multi: number | null
  benchmark_antutu: number | null
  benchmark_pcmark: number | null
  buy_links: Record<string, unknown>[]
  related_video_id: string | null
  related_tiktok_url: string | null
  seo_title: string | null
  seo_description: string | null
  seo_og_image: string | null
  created_at: string
  updated_at: string
  // Joined fields
  brand?: Brand | null
}

export interface Article {
  id: number
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  body: Record<string, unknown> | null
  body_html: string | null
  category: 'review' | 'comparison' | 'news' | 'buying-guide' | 'opinion' | null
  associated_device_id: number | null
  tags: string[]
  status: 'draft' | 'published'
  published_at: string | null
  reading_time_minutes: number | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
  // Joined fields
  associated_device?: Device | null
}

export interface Video {
  id: number
  title: string
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook'
  embed_id: string
  thumbnail_url: string | null
  view_count: number | null
  duration: string | null
  associated_device_id: number | null
  published_at: string | null
  featured: boolean
  created_at: string
  updated_at: string
}

export interface ComingSoon {
  id: number
  device_name: string
  silhouette_url: string | null
  expected_week: string
  teaser: string | null
  notify_emails: string[]
  notify_count: number
  linked_device_id: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Sponsor {
  id: number
  company_name: string
  logo_url: string
  website: string | null
  associated_video: string | null
  partnership_type: 'shoutout' | 'dedicated-video' | 'full-campaign' | 'product-seeding' | null
  display_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface SponsorshipPackage {
  id: number
  name: string
  tier: 'starter' | 'pro' | 'premium'
  description: string
  deliverables: string[]
  highlighted: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: number
  year: number
  title: string
  description: string | null
  display_order: number
  created_at: string
}

export interface Award {
  id: number
  award_name: string
  awarding_body: string
  year: number
  certificate_image: string | null
  award_url: string | null
  display_order: number
  created_at: string
}

export interface MediaKit {
  id: number
  short_bio: string | null
  long_bio: string | null
  total_followers: string | null
  total_views: string | null
  years_active: number | null
  youtube_followers: string | null
  tiktok_followers: string | null
  instagram_followers: string | null
  facebook_followers: string | null
  logo_light_url: string | null
  logo_dark_url: string | null
  logo_svg_light_url: string | null
  logo_svg_dark_url: string | null
  headshots: Record<string, unknown>[]
  brand_colours: Record<string, unknown>[]
  active: boolean
  created_at: string
  updated_at: string
}

export interface SiteSettings {
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

// Utility function to map Supabase row to Article type
export function mapArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as number,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: (row.excerpt as string) ?? null,
    featured_image: (row.featured_image as string) ?? null,
    body: (row.body as Record<string, unknown>) ?? null,
    body_html: (row.body_html as string) ?? null,
    category: (row.category as Article['category']) ?? null,
    associated_device_id: (row.associated_device_id as number) ?? null,
    tags: (row.tags as string[]) ?? [],
    status: (row.status as 'draft' | 'published'),
    published_at: (row.published_at as string) ?? null,
    reading_time_minutes: (row.reading_time_minutes as number) ?? null,
    seo_title: (row.seo_title as string) ?? null,
    seo_description: (row.seo_description as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    associated_device: row.associated_device as Device | null ?? null,
  }
}

export function mapDevice(row: Record<string, unknown>): Device {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    brand_id: (row.brand_id as number) ?? null,
    release_year: (row.release_year as number) ?? null,
    category: (row.category as Device['category']) ?? null,
    price_kes: (row.price_kes as number) ?? null,
    price_usd: (row.price_usd as number) ?? null,
    tagline: (row.tagline as string) ?? null,
    status: (row.status as 'draft' | 'published'),
    score_display: (row.score_display as number) ?? null,
    score_performance: (row.score_performance as number) ?? null,
    score_camera: (row.score_camera as number) ?? null,
    score_battery: (row.score_battery as number) ?? null,
    score_value: (row.score_value as number) ?? null,
    score_overall: (row.score_overall as number) ?? null,
    verdict_pros: (row.verdict_pros as string[]) ?? [],
    verdict_cons: (row.verdict_cons as string[]) ?? [],
    verdict_bottom_line: (row.verdict_bottom_line as string) ?? null,
    verdict_full: (row.verdict_full as string) ?? null,
    images: (row.images as Record<string, unknown>[]) ?? [],
    specs_design: (row.specs_design as Record<string, unknown>) ?? {},
    specs_display: (row.specs_display as Record<string, unknown>) ?? {},
    specs_processor: (row.specs_processor as Record<string, unknown>) ?? {},
    specs_memory: (row.specs_memory as Record<string, unknown>) ?? {},
    specs_camera: (row.specs_camera as Record<string, unknown>) ?? {},
    specs_battery: (row.specs_battery as Record<string, unknown>) ?? {},
    specs_connectivity: (row.specs_connectivity as Record<string, unknown>) ?? {},
    specs_software: (row.specs_software as Record<string, unknown>) ?? {},
    benchmark_geekbench_single: (row.benchmark_geekbench_single as number) ?? null,
    benchmark_geekbench_multi: (row.benchmark_geekbench_multi as number) ?? null,
    benchmark_antutu: (row.benchmark_antutu as number) ?? null,
    benchmark_pcmark: (row.benchmark_pcmark as number) ?? null,
    buy_links: (row.buy_links as Record<string, unknown>[]) ?? [],
    related_video_id: (row.related_video_id as string) ?? null,
    related_tiktok_url: (row.related_tiktok_url as string) ?? null,
    seo_title: (row.seo_title as string) ?? null,
    seo_description: (row.seo_description as string) ?? null,
    seo_og_image: (row.seo_og_image as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    brand: row.brand as Brand | null ?? null,
  }
}