// Shared CSV report generator — single source of truth for analytics exports.
// Used by /api/admin/export/[report] (on-demand download) AND the scheduled
// exports cron (/api/cron/scheduled-exports). Keeps format consistent.

import {
  getPageViewsOverTime,
  getTopPages,
  getTopAffiliatePages,
  getQualifiedLeads,
  getEarningsReconciliation,
  getLinkHealthSummary,
  runExploreQuery,
} from './queries'

export const REPORT_LABELS: Record<string, string> = {
  'page-views': 'Page Views',
  'top-pages': 'Top Pages',
  'affiliate-clicks': 'Affiliate Clicks',
  'qualified-leads': 'Qualified Leads',
  'earnings-reconciliation': 'Earnings Reconciliation',
  'link-health': 'Link Health',
  explore: 'Explore',
}

export function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0]).join(',')
  const body = data
    .map((row) =>
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
    )
    .join('\n')
  return `${headers}\n${body}`
}

export interface GenerateReportOptions {
  period?: string
  limit?: number
  metric?: string
  dimension?: string
}

export interface GeneratedReport {
  csv: string
  filename: string
}

export async function generateReportCsv(
  report: string,
  opts: GenerateReportOptions = {}
): Promise<GeneratedReport> {
  const period = opts.period ?? '30d'
  const date = new Date().toISOString().split('T')[0]

  switch (report) {
    case 'page-views': {
      const data = await getPageViewsOverTime(period)
      return {
        csv: toCSV(data.map((d) => ({ date: d.date, views: d.views }))),
        filename: `page-views-${period}-${date}.csv`,
      }
    }
    case 'top-pages': {
      const data = await getTopPages(period, opts.limit ?? 100)
      return {
        csv: toCSV(data.map((d, i) => ({ rank: i + 1, path: d.path, views: d.views }))),
        filename: `top-pages-${period}-${date}.csv`,
      }
    }
    case 'affiliate-clicks': {
      const data = await getTopAffiliatePages(period, opts.limit ?? 100)
      return {
        csv: toCSV(
          data.map((d, i) => ({
            rank: i + 1,
            device_slug: d.deviceSlug,
            retailer: d.retailer,
            clicks: d.clicks,
          }))
        ),
        filename: `affiliate-clicks-${period}-${date}.csv`,
      }
    }
    case 'qualified-leads': {
      const data = await getQualifiedLeads(period, opts.limit ?? 100)
      return {
        csv: toCSV(
          data.map((d, i) => ({
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
          }))
        ),
        filename: `qualified-leads-${period}-${date}.csv`,
      }
    }
    case 'earnings-reconciliation': {
      const data = await getEarningsReconciliation(period)
      return {
        csv: toCSV(
          data.rows.map((r) => ({
            retailer: r.retailer,
            clicks: r.clicks,
            est_revenue_proxy: r.proxyWeighted,
            actual_earnings: r.actualEarnings,
            variance: r.variance,
          }))
        ),
        filename: `earnings-reconciliation-${period}-${date}.csv`,
      }
    }
    case 'link-health': {
      const { brokenLinks } = await getLinkHealthSummary(opts.limit ?? 100)
      return {
        csv: toCSV(
          brokenLinks.map((l) => ({
            device_slug: l.deviceSlug,
            retailer: l.retailer,
            url: l.url,
            status_code: l.statusCode ?? '',
            ok: l.ok ? 'yes' : 'no',
          }))
        ),
        filename: `link-health-${date}.csv`,
      }
    }
    case 'explore': {
      const metric = opts.metric ?? 'views'
      const dimension = opts.dimension ?? 'path'
      const data = await runExploreQuery({ metric, dimension, period, limit: opts.limit ?? 25 })
      return {
        csv: toCSV(
          data.rows.map((r, i) => ({
            rank: i + 1,
            dimension: r.label,
            value: r.value,
            share_pct: r.sharePct,
          }))
        ),
        filename: `explore-${metric}-by-${dimension}-${period}-${date}.csv`,
      }
    }
    default:
      throw new Error(`Unknown report type: ${report}`)
  }
}