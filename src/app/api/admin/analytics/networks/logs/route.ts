import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { listAffiliateSyncLogs } from '@/lib/analytics/queries'

// GET /api/admin/analytics/networks/logs — recent sync runs across all networks.
export async function GET() {
  try {
    await requireAdminAuth()
    const logs = await listAffiliateSyncLogs(undefined, 30)
    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}