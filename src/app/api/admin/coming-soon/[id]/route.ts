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
      .from('coming_soon')
      .select('*, linked_device:devices(id, name, slug)')
      .eq('id', parseInt(id))
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Teaser not found' }, { status: 404 })
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
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await getAdminClient()

    const payload: Record<string, unknown> = {}
    if (body.device_name !== undefined) payload.device_name = body.device_name.trim()
    if (body.silhouette_url !== undefined) payload.silhouette_url = body.silhouette_url?.trim() ?? null
    if (body.expected_week !== undefined) payload.expected_week = body.expected_week.trim()
    if (body.teaser !== undefined) payload.teaser = body.teaser?.trim() ?? null
    if (body.notify_emails !== undefined) payload.notify_emails = body.notify_emails
    if (body.linked_device_id !== undefined) payload.linked_device_id = body.linked_device_id ?? null
    if (body.active !== undefined) payload.active = body.active

    const { data, error } = await supabase
      .from('coming_soon')
      .update(payload)
      .eq('id', parseInt(id))
      .select('*, linked_device:devices(id, name, slug)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Teaser not found' }, { status: 404 })
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
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const supabase = await getAdminClient()

    const { error } = await supabase
      .from('coming_soon')
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
