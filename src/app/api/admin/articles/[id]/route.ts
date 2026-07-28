import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth()
    const { id } = await params
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await getAdminClient()

    // Validate slug uniqueness if changed
    if (body.slug) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', parseInt(id))
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
    }

    // Compute reading time from body JSON if present
    let readingTimeMinutes = body.reading_time_minutes
    if (body.bodyJson) {
      const rawText = JSON.stringify(body.bodyJson)
      const wordCount = rawText.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
      readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))
    }

    const payload: Record<string, unknown> = {}
    if (body.title !== undefined) payload.title = body.title.trim()
    if (body.slug !== undefined) payload.slug = body.slug.trim()
    if (body.excerpt !== undefined) payload.excerpt = body.excerpt?.trim() ?? null
    if (body.featuredImage !== undefined) payload.featured_image = body.featuredImage?.trim() ?? null
    if (body.bodyJson !== undefined) payload.body = body.bodyJson
    if (body.category !== undefined) payload.category = body.category ?? null
    if (body.associatedDeviceId !== undefined) payload.associated_device_id = body.associatedDeviceId ?? null
    if (body.status !== undefined) {
      payload.status = body.status
      if (body.status === 'published') {
        payload.published_at = new Date().toISOString()
      }
    }
    if (body.seoTitle !== undefined) payload.seo_meta_title = body.seoTitle?.trim() ?? null
    if (body.seoDescription !== undefined) payload.seo_meta_description = body.seoDescription?.trim() ?? null
    payload.reading_time_minutes = readingTimeMinutes

    const { data, error } = await supabase
      .from('articles')
      .update(payload)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Trigger search reindex if published
    if (body.status === 'published') {
      try {
        const { indexArticle } = await import('@/lib/search/indexing')
        await indexArticle(data).catch(() => {})
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await getAdminClient()

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}