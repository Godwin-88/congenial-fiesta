import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { listCloudflareImages, uploadToCloudflare } from '@/lib/cloudflare-upload'

export type MediaSource = 'device-images' | 'article-images' | 'cloudflare'

export type MediaAsset = {
  /** Unique key across all sources, e.g. `supabase:device-images:<path>` or `cloudflare:<id>`. */
  id: string
  source: MediaSource
  /** Display filename. */
  filename: string
  /** Storage path (Supabase) or Cloudflare image id. */
  path: string
  /** Public, optimised URL. */
  url: string
  uploadedAt: string
  size?: number
}

const SUPABASE_BUCKETS: Array<MediaSource> = ['device-images', 'article-images']

/**
 * Recursively list a Supabase Storage bucket (files only), including nested
 * folders such as `ingested/{slug}/` used by the YouTube import pipeline.
 */
async function listSupabaseBucket(
  supabase: ReturnType<typeof getAdminClient>,
  bucket: MediaSource,
  maxDepth = 3,
): Promise<MediaAsset[]> {
  const out: MediaAsset[] = []

  async function walk(prefix: string, depth: number) {
    if (!supabase.storage) return
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error || !data) return

    for (const item of data) {
      if (item.id) {
        // It's a file
        const path = prefix ? `${prefix}/${item.name}` : item.name
        const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
        out.push({
          id: `supabase:${bucket}:${path}`,
          source: bucket,
          filename: item.name,
          path,
          url,
          uploadedAt: item.created_at ? String(item.created_at) : '',
          size: typeof item.metadata?.size === 'number' ? (item.metadata.size as number) : undefined,
        })
      } else if (depth > 0) {
        // It's a folder — walk it (capped at maxDepth levels)
        const p = prefix ? `${prefix}/${item.name}` : item.name
        await walk(p, depth - 1)
      }
    }
  }

  await walk('', maxDepth)
  return out
}

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = getAdminClient()

    const assets: MediaAsset[] = []

    // 1. Supabase Storage: device-images + article-images (the device images
    //    the admin device editor references, plus article gallery images).
    for (const bucket of SUPABASE_BUCKETS) {
      try {
        assets.push(...(await listSupabaseBucket(supabase, bucket)))
      } catch (e) {
        console.error(`Media: failed to list Supabase bucket "${bucket}":`, e)
      }
    }

    // 2. Cloudflare Images (if configured)
    try {
      const cfImages = await listCloudflareImages()
      for (const img of cfImages) {
        assets.push({
          id: `cloudflare:${img.id}`,
          source: 'cloudflare',
          filename: img.filename,
          path: img.id,
          url: img.url,
          uploadedAt: img.uploaded,
        })
      }
    } catch (e) {
      console.error('Media: failed to list Cloudflare images:', e)
    }

    return NextResponse.json({ data: assets })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use JPG, PNG, WebP, GIF, or AVIF.' },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    const destination = (formData.get('destination') as MediaSource) || 'device-images'

    // Cloudflare Images route
    if (destination === 'cloudflare') {
      const url = await uploadToCloudflare(file, file.name)
      return NextResponse.json({ url, destination, filename: file.name, size: file.size }, { status: 201 })
    }

    // Supabase Storage route
    if (destination !== 'device-images' && destination !== 'article-images') {
      return NextResponse.json({ error: 'Unknown destination' }, { status: 400 })
    }

    const supabase = getAdminClient()

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from(destination)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to upload file: ' + error.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from(destination).getPublicUrl(data.path)

    return NextResponse.json(
      { url: urlData.publicUrl, filename: file.name, destination, size: file.size },
      { status: 201 }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
