import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import {
  getRetentionStatus,
  purgeExpiredRawEvents,
  expungeVisitorData,
  listRetentionLog,
} from '@/lib/analytics/queries'

// POST /api/admin/analytics/retention  - retention policy actions (owner/admin)
//   { action: 'status' }             read-only snapshot
//   { action: 'preview' }            compute what a purge WOULD remove (no-op)
//   { action: 'purge' }              execute the TTL purge (logged)
//   { action: 'expunge', fpId }      DPA expunge-on-request for one visitor
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const action = String(body.action ?? '')

    switch (action) {
      case 'status': {
        return NextResponse.json({
          status: await getRetentionStatus(),
          log: await listRetentionLog(10),
        })
      }
      case 'preview': {
        const preview = await purgeExpiredRawEvents(true, 'admin-preview')
        return NextResponse.json({ preview })
      }
      case 'purge': {
        const result = await purgeExpiredRawEvents(false, 'admin')
        return NextResponse.json({ result })
      }
      case 'expunge': {
        const fpId = typeof body.fpId === 'string' ? body.fpId.trim() : ''
        if (!fpId) return NextResponse.json({ error: 'Missing fpId' }, { status: 400 })
        const result = await expungeVisitorData(fpId, 'admin')
        return NextResponse.json({ result })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}