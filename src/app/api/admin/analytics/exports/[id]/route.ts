import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { updateScheduledExport, deleteScheduledExport } from '@/lib/analytics/queries'

// PATCH  /api/admin/analytics/exports/[id] — update or toggle enable (owner/admin)
// DELETE /api/admin/analytics/exports/[id] — remove a job (owner/admin)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const jobId = Number(id)
    if (!Number.isFinite(jobId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const body = await req.json()
    const patch: Record<string, unknown> = {}
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
    if (typeof body.period === 'string') patch.period = body.period
    if (typeof body.cadence === 'string') patch.cadence = body.cadence
    if (Array.isArray(body.recipients)) patch.recipients = body.recipients.map(String).slice(0, 10)
    if (body.config && typeof body.config === 'object') patch.config = body.config

    const job = await updateScheduledExport(jobId, patch)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ job })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const jobId = Number(id)
    if (!Number.isFinite(jobId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const ok = await deleteScheduledExport(jobId)
    if (!ok) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}