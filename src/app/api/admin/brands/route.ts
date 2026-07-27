import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    // Get brands with device count
    const { data, error } = await supabase
      .from('brands')
      .select('*, device_count:devices(count)')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to flatten device_count
    const brands = (data ?? []).map((b: Record<string, unknown>) => ({
      ...b,
      device_count: (b.device_count as Array<{ count: number }>)?.[0]?.count ?? 0,
    }))

    return NextResponse.json({ data: brands })
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

    if (!body.name || !body.slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: body.name.trim(),
        slug: body.slug.trim(),
        logo_url: body.logo_url?.trim() ?? null,
        website: body.website?.trim() ?? null,
        featured: body.featured ?? false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}