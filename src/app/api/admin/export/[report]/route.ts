import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getUser } from '@/lib/auth/actions'
import {
  getPageViewsOverTime,
  getTopPages,
  getTopAffiliatePages,
  getQualifiedLeads,
  getEarningsReconciliation,
  getLinkHealthSummary,
} from '@/lib/analytics/queries'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0]).join(',')
  const body = data.map((row) =>
    Object.values(row)
      .map((val) => {
        const str = String(val ?? '')
        // Escape commas and quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  ).join('\n')
  return `${headers}\n${body}`
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> }
) {
  const { report } = await params

  // Auth check
  const user = await getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(_request.url)
  const period = url.searchParams.get('period') ?? '30d'
  const date = new Date().toISOString().split('T')[0]

  let csv = ''
  let filename = ''

  switch (report) {
    case 'page-views': {
      const data = await getPageViewsOverTime(period)
      csv = toCSV(data.map((d) => ({ date: d.date, views: d.views })))
      filename = `page-views-${period}-${date}.csv`
      break
    }
    case 'top-pages': {
      const data = await getTopPages(period, 100)
      csv = toCSV(data.map((d, i) => ({ rank: i + 1, path: d.path, views: d.views })))
      filename = `top-pages-${period}-${date}.csv`
      break
    }
    case 'affiliate-clicks': {
      const data = await getTopAffiliatePages(period, 100)
      csv = toCSV(data.map((d, i) => ({
        rank: i + 1,
        device_slug: d.deviceSlug,
        retailer: d.retailer,
        clicks: d.clicks,
      })))
      filename = `affiliate-clicks-${period}-${date}.csv`
      break
    }
    case 'qualified-leads': {
      const data = await getQualifiedLeads(period, 100)
      csv = toCSV(data.map((d, i) => ({
        rank: i + 1,
        visitor_id: d.fpId,
        tier: d.bucket,
        intent_score: d.score,
        signed_in: d.signedIn ? 'yes' : 'no',
        compares: d.compares,
        saves: d.saves,
        watches: d.watches,
        related_clicks: d.relatedClicks,
        affiliate_clicks: d.affiliateClicks,
        last_active: d.lastSeenAt ?? '',
      })))
      filename = `qualified-leads-${period}-${date}.csv`
      break
    }
    case 'earnings-reconciliation': {
      const data = await getEarningsReconciliation(period)
      csv = toCSV(data.rows.map((r) => ({
        retailer: r.retailer,
        clicks: r.clicks,
        est_revenue_proxy: r.proxyWeighted,
        actual_earnings: r.actualEarnings,
        variance: r.variance,
      })))
      filename = `earnings-reconciliation-${period}-${date}.csv`
      break
    }
    case 'link-health': {
      const { brokenLinks } = await getLinkHealthSummary(100)
      csv = toCSV(brokenLinks.map((l) => ({
        device_slug: l.deviceSlug,
        retailer: l.retailer,
        url: l.url,
        status_code: l.statusCode ?? '',
        ok: l.ok ? 'yes' : 'no',
      })))
      filename = `link-health-${date}.csv`
      break
    }
    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}