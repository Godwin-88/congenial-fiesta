import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('coming_soon')
      .select('*, linked_device:devices(id, name, slug)')
      .order('created_at', { ascending: true })

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
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    if (!body.device_name || !body.expected_week) {
      return NextResponse.json({ error: 'Device name and expected week are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('coming_soon')
      .insert({
        device_name: body.device_name.trim(),
        silhouette_url: body.silhouette_url?.trim() ?? null,
        expected_week: body.expected_week.trim(),
        teaser: body.teaser?.trim() ?? null,
        notify_emails: body.notify_emails ?? [],
        linked_device_id: body.linked_device_id ?? null,
        active: body.active ?? true,
      })
      .select('*, linked_device:devices(id, name, slug)')
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
