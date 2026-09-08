import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import {
  updateAffiliateNetwork,
  deleteAffiliateNetwork,
  listAffiliateSyncLogs,
  type AffiliateNetworkPatch,
} from '@/lib/analytics/queries'

type RouteCtx = { params: Promise<{ id: string }> }

// PATCH /api/admin/analytics/networks/:id — update a network (owner/admin only).
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const patch: AffiliateNetworkPatch = {}
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
    if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) patch.baseUrl = body.baseUrl
    if (body.authType) patch.authType = body.authType
    if (body.authEnvKey !== undefined) patch.authEnvKey = body.authEnvKey ? String(body.authEnvKey) : null
    if (body.authQueryParam !== undefined) patch.authQueryParam = body.authQueryParam ? String(body.authQueryParam) : null
    if (body.mapping && typeof body.mapping === 'object') patch.mapping = body.mapping
    if (body.note !== undefined) patch.note = body.note ? String(body.note) : null

    const network = await updateAffiliateNetwork(Number(id), patch)
    return NextResponse.json({ network })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 400 })
  }
}

// DELETE /api/admin/analytics/networks/:id — remove a network config.
export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    await deleteAffiliateNetwork(Number(id))
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

// GET /api/admin/analytics/networks/:id/logs — sync audit trail for one network.
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    await requireAdminAuth()
    const { id } = await params
    const logs = await listAffiliateSyncLogs(Number(id), 30)
    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}