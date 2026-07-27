import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const page = parseInt(searchParams.get('page') ?? '1')

    const supabase = await getAdminClient()
    const offset = (page - 1) * limit

    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && ['draft', 'published'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    // Validate required fields
    if (!body.title || body.title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
    }
    if (!body.slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    // Compute reading time from body_html if present
    let readingTimeMinutes = null
    if (body.body_html) {
      const wordCount = body.body_html.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
      readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))
    }

    const payload = {
      title: body.title.trim(),
      slug: body.slug.trim(),
      excerpt: body.excerpt?.trim() ?? null,
      featured_image: body.featuredImage?.trim() ?? null,
      body: body.bodyJson ?? null,
      body_html: body.bodyHtml ?? null,
      category: body.category ?? null,
      associated_device_id: body.associatedDeviceId ?? null,
      tags: body.tags ?? [],
      status: body.status ?? 'draft',
      published_at: body.status === 'published' ? new Date().toISOString() : null,
      reading_time_minutes: readingTimeMinutes,
      seo_title: body.seoTitle?.trim() ?? null,
      seo_description: body.seoDescription?.trim() ?? null,
    }

    const { data, error } = await supabase
      .from('articles')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger search reindex if published
    if (body.status === 'published') {
      try {
        const { indexArticle } = await import('@/lib/search/indexing')
        await indexArticle(data).catch(() => {})
      } catch {
        // Non-blocking: search indexing is optional
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}