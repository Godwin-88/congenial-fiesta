import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { syncAffiliateNetwork } from '@/lib/analytics/queries'

type RouteCtx = { params: Promise<{ id: string }> }

// POST /api/admin/analytics/networks/:id/sync — trigger an immediate sync (owner/admin).
export async function POST(_req: NextRequest, { params }: RouteCtx) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const result = await syncAffiliateNetwork(Number(id))
    return NextResponse.json({ result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 500 })
  }
}