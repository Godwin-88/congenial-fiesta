// Shared helpers for importing devices from YouTube RSS / external sources.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { YouTubeVideo } from '@/lib/youtube/client'

export const BRAND_KEYWORDS = [
  'iphone', 'ipad', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'redmi',
  'oppo', 'vivo', 'honor', 'nothing', 'motorola', 'razr', 'fold',
  'apple', 'samsung', 'google pixel', 'pixel', 'tecno', 'infinix',
  'itel', 'nokia', 'huawei', 'realme', 'asus', 'lenovo', 'hp',
  'dell', 'acer', 'msi', 'sony', 'lg', 'blackberry', 'fairphone',
]

// Map brand keywords to canonical brand names + slugs
const BRAND_MAP: Array<{ keywords: string[]; name: string; slug: string }> = [
  { keywords: ['iphone', 'ipad', 'apple'], name: 'Apple', slug: 'apple' },
  { keywords: ['galaxy', 'samsung'], name: 'Samsung', slug: 'samsung' },
  { keywords: ['pixel', 'google pixel'], name: 'Google', slug: 'google' },
  { keywords: ['oneplus'], name: 'OnePlus', slug: 'oneplus' },
  { keywords: ['xiaomi'], name: 'Xiaomi', slug: 'xiaomi' },
  { keywords: ['redmi'], name: 'Redmi', slug: 'redmi' },
  { keywords: ['oppo'], name: 'Oppo', slug: 'oppo' },
  { keywords: ['vivo'], name: 'Vivo', slug: 'vivo' },
  { keywords: ['honor'], name: 'Honor', slug: 'honor' },
  { keywords: ['nothing'], name: 'Nothing', slug: 'nothing' },
  { keywords: ['motorola', 'razr'], name: 'Motorola', slug: 'motorola' },
  { keywords: ['tecno'], name: 'Tecno', slug: 'tecno' },
  { keywords: ['infinix'], name: 'Infinix', slug: 'infinix' },
  { keywords: ['itel'], name: 'Itel', slug: 'itel' },
  { keywords: ['nokia'], name: 'Nokia', slug: 'nokia' },
  { keywords: ['huawei'], name: 'Huawei', slug: 'huawei' },
  { keywords: ['realme'], name: 'Realme', slug: 'realme' },
  { keywords: ['asus'], name: 'Asus', slug: 'asus' },
  { keywords: ['lenovo'], name: 'Lenovo', slug: 'lenovo' },
  { keywords: ['hp', 'hewlett'], name: 'HP', slug: 'hp' },
  { keywords: ['dell'], name: 'Dell', slug: 'dell' },
  { keywords: ['acer'], name: 'Acer', slug: 'acer' },
  { keywords: ['msi'], name: 'MSI', slug: 'msi' },
  { keywords: ['sony'], name: 'Sony', slug: 'sony' },
  { keywords: ['lg'], name: 'LG', slug: 'lg' },
  { keywords: ['blackberry'], name: 'BlackBerry', slug: 'blackberry' },
  { keywords: ['fairphone'], name: 'Fairphone', slug: 'fairphone' },
]

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

export function detectBrand(text: string): { name: string; slug: string } | null {
  const haystack = text.toLowerCase()
  for (const brand of BRAND_MAP) {
    if (brand.keywords.some((kw) => haystack.includes(kw))) {
      return { name: brand.name, slug: brand.slug }
    }
  }
  return null
}

export function extractDeviceName(title: string): string | null {
  const cleaned = title
    .replace(/^\[.*?\]\s*/, '')
    .replace(/^\(.*?\)\s*/, '')
    .replace(/\s*[-|:].*$/, '')
    .trim()

  // Match brand + model pattern, e.g. "iPhone 15 Pro", "Galaxy S24 Ultra", "Pixel 8 Pro"
  const match = cleaned.match(
    /((?:iPhone|iPad|Galaxy|Pixel|OnePlus|Xiaomi|Redmi|Oppo|Vivo|Honor|Nothing|Motorola|Razr|Fold|Tecno|Infinix|Itel|Nokia|Huawei|Realme|Asus|Lenovo|HP|Dell|Acer|MSI|Sony|LG|BlackBerry|Fairphone)[\w\s\+\-]*?)(?:\s*\(|\s*-|\s*:|\s*$)/i,
  )
  if (match && match[1].trim().length > 3) {
    return match[1].trim()
  }
  // Fallback: use the cleaned title if it looks like a device name
  if (cleaned.length > 5 && cleaned.length < 60) {
    return cleaned
  }
  return null
}

export function inferCategory(name: string): 'flagship' | 'mid-range' | 'budget' | 'ultra-premium' {
  const lower = name.toLowerCase()
  if (
    lower.includes('pro max') ||
    lower.includes('ultra') ||
    lower.includes('fold') ||
    lower.includes('z fold') ||
    lower.includes('s24 ultra') ||
    lower.includes('s25 ultra')
  ) {
    return 'ultra-premium'
  }
  if (
    lower.includes('pro') ||
    lower.includes('plus') ||
    lower.includes('s24') ||
    lower.includes('s25') ||
    lower.includes('s23') ||
    lower.includes('pixel 8') ||
    lower.includes('pixel 9') ||
    lower.includes('iphone 15') ||
    lower.includes('iphone 16') ||
    lower.includes('oneplus 12') ||
    lower.includes('oneplus 13')
  ) {
    return 'flagship'
  }
  if (
    lower.includes('a5') ||
    lower.includes('a3') ||
    lower.includes('redmi note') ||
    lower.includes('moto g') ||
    lower.includes('pixel 7a') ||
    lower.includes('pixel 8a') ||
    lower.includes('iphone se')
  ) {
    return 'mid-range'
  }
  if (
    lower.includes('a1') ||
    lower.includes('redmi a') ||
    lower.includes('moto e') ||
    lower.includes('itel') ||
    lower.includes('infinix smart')
  ) {
    return 'budget'
  }
  return 'mid-range'
}

export function isDeviceItem(title: string, contentSnippet: string): boolean {
  const haystack = `${title} ${contentSnippet}`.toLowerCase()
  return BRAND_KEYWORDS.some((kw) => haystack.includes(kw))
}

export type ImportResult = {
  fetched: number
  created: number
  updated: number
  skipped: number
}

/**
 * Core import loop: fetch latest YouTube videos, detect device mentions,
 * auto-create brands, and upsert devices (published, 0 scores) into Supabase.
 * Used by both the QStash cron route and the one-off seeding script.
 */
export async function importDevicesFromYouTube(
  supabase: SupabaseClient,
  videos: YouTubeVideo[],
): Promise<ImportResult> {
  let fetched = 0
  let created = 0
  let updated = 0
  let skipped = 0

  for (const video of videos) {
    fetched++
    const title = video.title || ''
    const description = video.description || ''

    if (!isDeviceItem(title, description)) {
      skipped++
      continue
    }

    const deviceName = extractDeviceName(title)
    if (!deviceName) {
      skipped++
      continue
    }

    const brand = detectBrand(`${title} ${description}`)
    if (!brand) {
      skipped++
      continue
    }

    const slug = slugify(deviceName)
    if (!slug) {
      skipped++
      continue
    }

    try {
      // Ensure brand exists
      let brandId: number | null = null
      const { data: existingBrand } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand.slug)
        .maybeSingle()

      if (existingBrand) {
        brandId = existingBrand.id
      } else {
        const { data: newBrand, error: brandError } = await supabase
          .from('brands')
          .insert({ name: brand.name, slug: brand.slug })
          .select('id')
          .single()
        if (brandError) {
          console.error(`Failed to create brand ${brand.name}:`, brandError)
          skipped++
          continue
        }
        brandId = newBrand.id
      }

      // Check if device already exists
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id, related_video_id')
        .eq('slug', slug)
        .maybeSingle()

      let deviceId: number | null = existingDevice?.id ?? null

      const thumbnailUrl = video.thumbnailUrl
      const images = thumbnailUrl
        ? [{ url: thumbnailUrl, alt: deviceName, isPrimary: true }]
        : []

      const payload = {
        name: deviceName,
        slug,
        brand_id: brandId,
        price_tier: inferCategory(deviceName),
        tagline: title.slice(0, 160),
        status: 'published',
        scores_overall: 0,
        score_display: 0,
        score_performance: 0,
        score_camera: 0,
        score_battery: 0,
        score_value: 0,
        images,
        related_video_id: video.id,
        seo_description: description.slice(0, 300),
      }

      if (existingDevice) {
        // Update related video if a newer review exists
        if (existingDevice.related_video_id !== video.id) {
          const { error: updateError } = await supabase
            .from('devices')
            .update({ related_video_id: video.id })
            .eq('id', existingDevice.id)
          if (updateError) {
            console.error(`Failed to update device ${slug}:`, updateError)
            skipped++
            continue
          }
          updated++
        } else {
          skipped++
        }
      } else {
        const { data: newDevice, error: insertError } = await supabase
          .from('devices')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) {
          console.error(`Failed to insert device ${slug}:`, insertError)
          skipped++
          continue
        }
        deviceId = newDevice?.id ?? null
        created++
      }

      // Link the video in the videos table (if it exists there)
      const { data: existingVideo } = await supabase
        .from('videos')
        .select('id')
        .eq('embed_id', video.id)
        .maybeSingle()

      if (existingVideo && deviceId) {
        await supabase
          .from('videos')
          .update({ associated_device_id: deviceId })
          .eq('id', existingVideo.id)
      }
    } catch (err) {
      console.error(`Error processing video "${title}":`, err)
      skipped++
    }
  }

  return { fetched, created, updated, skipped }
}