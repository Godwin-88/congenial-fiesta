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
      .from('awards')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 })
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
    if (body.award_name !== undefined) payload.award_name = body.award_name.trim()
    if (body.awarding_body !== undefined) payload.awarding_body = body.awarding_body.trim()
    if (body.year !== undefined) payload.year = body.year
    if (body.certificate_image !== undefined) payload.certificate_image = body.certificate_image?.trim() ?? null
    if (body.award_url !== undefined) payload.award_url = body.award_url?.trim() ?? null
    if (body.display_order !== undefined) payload.display_order = body.display_order

    const { data, error } = await supabase
      .from('awards')
      .update(payload)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Award not found' }, { status: 404 })
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
      .from('awards')
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
