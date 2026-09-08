import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { updateAlertRule, deleteAlertRule } from '@/lib/analytics/queries'

// PATCH /api/admin/analytics/rules/:id  - update (incl. enable/disable toggle)
// DELETE /api/admin/analytics/rules/:id - delete a rule (owner/admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const ruleId = Number(id)
    if (!Number.isFinite(ruleId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

    const body = await req.json()
    const patch: { name?: string; kpi?: string; operator?: 'gt' | 'lt'; threshold?: number; period?: string; description?: string | null; enabled?: boolean } = {}

    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
    if (typeof body.kpi === 'string') patch.kpi = body.kpi
    if (body.operator === 'gt' || body.operator === 'lt') patch.operator = body.operator
    if (typeof body.threshold === 'number' && Number.isFinite(body.threshold)) patch.threshold = body.threshold
    if (['7d', '30d', '90d'].includes(String(body.period))) patch.period = String(body.period)
    if (typeof body.description === 'string') patch.description = body.description.trim() || null
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled

    const rule = await updateAlertRule(ruleId, patch)
    if (!rule) return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
    return NextResponse.json({ rule })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const ruleId = Number(id)
    if (!Number.isFinite(ruleId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

    const ok = await deleteAlertRule(ruleId)
    if (!ok) return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}