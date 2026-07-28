import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await getAdminClient()

    const payload: Record<string, unknown> = {}
    if (body.company_name !== undefined) payload.company_name = body.company_name.trim()
    if (body.logo_url !== undefined) payload.logo_url = body.logo_url?.trim() ?? null
    if (body.website !== undefined) payload.website = body.website?.trim() ?? null
    if (body.associated_video !== undefined) payload.associated_video = body.associated_video?.trim() ?? null
    if (body.partnership_type !== undefined) payload.partnership_type = body.partnership_type ?? null
    if (body.display_order !== undefined) payload.display_order = body.display_order
    if (body.active !== undefined) payload.active = body.active

    const { data, error } = await supabase
      .from('sponsors')
      .update(payload)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 })
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
      .from('sponsors')
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
