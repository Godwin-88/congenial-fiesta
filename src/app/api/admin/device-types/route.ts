import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

const VALID_MAJORS = ['phones', 'televisions', 'sound', 'macs']

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('device_types')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
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

    if (!body.label || !body.slug || !body.major_category) {
      return NextResponse.json({ error: 'label, slug and major_category are required' }, { status: 400 })
    }
    if (!VALID_MAJORS.includes(body.major_category)) {
      return NextResponse.json({ error: 'Invalid major_category' }, { status: 400 })
    }

    const payload = {
      label: String(body.label).trim(),
      slug: String(body.slug).trim().toLowerCase(),
      major_category: body.major_category,
      display_order: Number(body.display_order) || 0,
    }

    const { data, error } = await supabase
      .from('device_types')
      .insert(payload)
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
