import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('sponsorship_packages')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    if (!body.name?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 })
    }

    if (!['starter', 'pro', 'premium'].includes(body.tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sponsorship_packages')
      .insert({
        name: body.name.trim(),
        tier: body.tier,
        description: body.description.trim(),
        deliverables: body.deliverables ?? [],
        highlighted: body.highlighted ?? false,
        display_order: body.display_order ?? 0,
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
