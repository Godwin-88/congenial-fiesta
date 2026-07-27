import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

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
        .from('brands')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', parseInt(id))
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
      }
    }

    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = body.name.trim()
    if (body.slug !== undefined) payload.slug = body.slug.trim()
    if (body.logo_url !== undefined) payload.logo_url = body.logo_url?.trim() ?? null
    if (body.website !== undefined) payload.website = body.website?.trim() ?? null
    if (body.featured !== undefined) payload.featured = body.featured

    const { data, error } = await supabase
      .from('brands')
      .update(payload)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
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

    // Check if brand has linked devices
    const deviceResult = await supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', parseInt(id))

    const deviceCount = deviceResult.count ?? 0
    if (deviceCount > 0) {
      return NextResponse.json(
        { error: 'Remove linked devices first' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('brands')
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