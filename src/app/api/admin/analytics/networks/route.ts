import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import {
  getAffiliateNetworks,
  upsertAffiliateNetwork,
  deleteAffiliateNetwork,
  type AffiliateNetworkInput,
} from '@/lib/analytics/queries'

// GET /api/admin/analytics/networks — list configured affiliate networks.
// POST /api/admin/analytics/networks — create a network (owner/admin only).

export async function GET() {
  try {
    await requireAdminAuth()
    const networks = await getAffiliateNetworks()
    return NextResponse.json({ networks })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const input: AffiliateNetworkInput = {
      name: String(body.name ?? ''),
      label: String(body.label ?? ''),
      baseUrl: String(body.baseUrl ?? ''),
      authType: body.authType ?? 'bearer',
      authEnvKey: body.authEnvKey ? String(body.authEnvKey) : null,
      authQueryParam: body.authQueryParam ? String(body.authQueryParam) : null,
      mapping: body.mapping && typeof body.mapping === 'object' ? body.mapping : {},
      note: body.note ? String(body.note) : null,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
    }
    if (!input.name.trim() || !input.label.trim() || !input.baseUrl.trim()) {
      return NextResponse.json({ error: 'name, label and baseUrl are required' }, { status: 400 })
    }
    const network = await upsertAffiliateNetwork(input)
    return NextResponse.json({ network })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 400 })
  }
}