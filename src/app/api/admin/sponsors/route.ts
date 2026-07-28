import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('display_order', { ascending: true })
      .order('company_name', { ascending: true })

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

    if (!body.company_name?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sponsors')
      .insert({
        company_name: body.company_name.trim(),
        logo_url: body.logo_url?.trim() ?? null,
        website: body.website?.trim() ?? null,
        associated_video: body.associated_video?.trim() ?? null,
        partnership_type: body.partnership_type ?? null,
        display_order: body.display_order ?? 0,
        active: body.active ?? true,
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
