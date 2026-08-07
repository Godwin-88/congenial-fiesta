import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createServerClient } from '@supabase/ssr'
import { fetchYouTubeVideos } from '@/lib/youtube/client'
import {
  detectBrand,
  extractDeviceName,
  inferCategory,
  isDeviceItem,
  slugify,
} from '@/lib/devices/import'

function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
}

export const GET = verifySignatureAppRouter(async () => {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return NextResponse.json({ error: 'Missing signing key' }, { status: 500 })
  }

  const supabase = getAdminClient()

  // Fetch latest YouTube videos (RSS + API fallback)
  let videos: Awaited<ReturnType<typeof fetchYouTubeVideos>> = []
  try {
    videos = await fetchYouTubeVideos(50)
  } catch (err) {
    console.error('Failed to fetch YouTube videos:', err)
    return NextResponse.json({ status: 'error', error: 'YouTube fetch failed' }, { status: 500 })
  }

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
        category: inferCategory(deviceName),
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

  return NextResponse.json({
    status: 'ok',
    fetched,
    created,
    updated,
    skipped,
  })
})