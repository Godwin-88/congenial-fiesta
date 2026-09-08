import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/require-admin'
import { createAlertRule } from '@/lib/analytics/queries'

// POST /api/admin/analytics/rules  - create an alert rule (owner/admin)
const ALLOWED_KPIS = new Set([
  'views', 'unique_visitors', 'return_rate', 'device_views', 'affiliate_clicks',
  'device_to_ctr', 'revenue_proxy', 'zero_report', 'search_gap',
  'consideration_events', 'trust_coverage', 'hot_leads', 'broken_links',
])

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminAuth()
    if (admin.role !== 'owner' && admin.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const kpi = String(body.kpi ?? '')
    const operator = body.operator === 'lt' ? 'lt' : 'gt'
    const threshold = Number(body.threshold)
    const period = ['7d', '30d', '90d'].includes(String(body.period)) ? String(body.period) : '30d'
    const description = typeof body.description === 'string' ? body.description.trim() : null

    if (!name || !ALLOWED_KPIS.has(kpi) || !Number.isFinite(threshold) || threshold < 0) {
      return NextResponse.json({ error: 'Invalid rule payload' }, { status: 400 })
    }

    const rule = await createAlertRule({ name, kpi, operator, threshold, period, description })
    if (!rule) return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
    return NextResponse.json({ rule })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}