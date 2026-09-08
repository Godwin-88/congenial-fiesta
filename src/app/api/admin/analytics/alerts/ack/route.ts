import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

// POST /api/admin/analytics/alerts/ack  { id }  - acknowledge a fired alert
export async function POST(req: NextRequest) {
  try {
    await requireAdminAuth()
    const body = await req.json()
    const id = Number(body.id)
    if (!id) return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })

    const supabase = getAdminClient()
    const { error } = await supabase
      .from('alert_events')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}