import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { deleteFromCloudflare } from '@/lib/cloudflare-upload'
import type { MediaSource } from '../route'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Source is passed as a query param so the same endpoint can delete from
    // Cloudflare Images (by image id) or Supabase Storage (by bucket + path).
    const url = new URL(request.url)
    const source = (url.searchParams.get('source') as MediaSource | null) ?? 'cloudflare'

    if (source === 'cloudflare') {
      await deleteFromCloudflare(id)
      return NextResponse.json({ success: true })
    }

    if (source === 'device-images' || source === 'article-images') {
      const path = url.searchParams.get('path')
      if (!path) {
        return NextResponse.json({ error: 'Missing path for Supabase deletion' }, { status: 400 })
      }

      const supabase = getAdminClient()
      const { error } = await supabase.storage.from(source).remove([path])
      if (error) {
        console.error(`Media: failed to delete ${source}/${path}:`, error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
