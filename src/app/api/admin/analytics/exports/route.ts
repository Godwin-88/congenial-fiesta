import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import {
  listScheduledExports,
  createScheduledExport,
  SCHEDULED_EXPORT_REPORTS,
} from '@/lib/analytics/queries'

// GET  /api/admin/analytics/exports — list scheduled exports (any admin)
// POST /api/admin/analytics/exports — create a scheduled export (owner/admin)

export async function GET() {
  try {
    await requireAdminAuth()
    const exports = await listScheduledExports()
    return NextResponse.json({ exports })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}

const VALID_CRONES = new Set(['daily', 'weekly', 'monthly'])
const VALID_DESTINATIONS = new Set(['email', 'slack'])
const VALID_PERIODS = new Set(['7d', '30d', '90d'])

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const report = String(body.report ?? '')
    const period = VALID_PERIODS.has(String(body.period)) ? String(body.period) : '30d'
    const cadence = VALID_CRONES.has(String(body.cadence)) ? String(body.cadence) : ''
    const destination = VALID_DESTINATIONS.has(String(body.destination))
      ? String(body.destination)
      : ''

    if (!SCHEDULED_EXPORT_REPORTS.includes(report)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    if (!cadence || !destination) {
      return NextResponse.json({ error: 'Invalid cadence or destination' }, { status: 400 })
    }

    const recipientsRaw = Array.isArray(body.recipients) ? body.recipients : []
    const recipients = recipientsRaw.map(String).filter((r: string) => r.includes('@')).slice(0, 10)
    const config = body.config && typeof body.config === 'object' ? body.config : {}

    const job = await createScheduledExport({ report, period, cadence, destination, recipients, config })
    if (!job) return NextResponse.json({ error: 'Failed to create export job' }, { status: 500 })
    return NextResponse.json({ job })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}