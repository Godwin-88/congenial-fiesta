import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { evaluateAlerts, type AlertBreach } from '@/lib/analytics/queries'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const adminEmail = process.env.ADMIN_EMAIL
const mailFrom = process.env.MAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? 'business@fweezytech.com'
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

const KPI_LABELS: Record<string, string> = {
  views: 'Page views',
  unique_visitors: 'Unique visitors',
  return_rate: 'Return rate',
  device_views: 'Device page views',
  affiliate_clicks: 'Affiliate clicks',
  device_to_ctr: 'Device to click rate',
  revenue_proxy: 'Estimated revenue proxy',
  zero_report: 'Revenue-leak views (zero-click devices)',
  search_gap: 'Zero-result searches',
  consideration_events: 'Consideration events',
  trust_coverage: 'Trust coverage',
  hot_leads: 'Hot-tier qualified leads',
  broken_links: 'Broken buy links',
}

function formatValue(value: number, kpi: string): string {
  const suffix = kpi === 'device_to_ctr' || kpi === 'return_rate' || kpi === 'trust_coverage' ? '%' : ''
  return `${value.toLocaleString()}${suffix}`
}

function buildEmailRows(breaches: AlertBreach[]): string {
  return breaches
    .map((b) => {
      const label = KPI_LABELS[b.kpi] ?? b.kpi
      const op = b.operator === 'gt' ? 'above' : 'below'
      return (
        `<tr style="background:#111827;">
          <td style="color:#F9FAFB;padding:8px 10px;">${b.ruleName}</td>
          <td style="color:#D1D5DB;padding:8px 10px;">${label}</td>
          <td style="color:#F59E0B;padding:8px 10px;text-align:right;">${formatValue(b.value, b.kpi)}</td>
          <td style="color:#9CA3AF;padding:8px 10px;text-align:right;">${op} ${formatValue(b.threshold, b.kpi)}</td>
        </tr>`
      )
    })
    .join('')
}

const cronHandler = verifySignatureAppRouter(async () => {
  const breaches = await evaluateAlerts()

  if (breaches.length > 0 && adminEmail && isEmailConfigured()) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F14; color: #F9FAFB; padding: 24px; border-radius: 8px;">
        <h1 style="color: #F59E0B; font-size: 22px;">${breaches.length} analytics rule(s) breached</h1>
        <p style="color: #9CA3AF;">Evaluated ${new Date().toUTCString()}</p>
        <table style="width:100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr>
              <th style="text-align:left;color:#9CA3AF;padding:8px 10px;">Rule</th>
              <th style="text-align:left;color:#9CA3AF;padding:8px 10px;">KPI</th>
              <th style="text-align:right;color:#9CA3AF;padding:8px 10px;">Current</th>
              <th style="text-align:right;color:#9CA3AF;padding:8px 10px;">Threshold</th>
            </tr>
          </thead>
          <tbody>${buildEmailRows(breaches)}</tbody>
        </table>
        <p style="color:#9CA3AF; font-size:12px; margin-top:24px;">
          <a href="${serverUrl}/admin/analytics?tab=goals" style="color:#0066FF;">Review the Goals &amp; Alerts tab</a>
        </p>
      </div>`

    await sendEmail({
      from: mailFrom,
      to: adminEmail,
      subject: `FweezyTech Alerts - ${breaches.length} rule(s) breached`,
      html,
    })
  }

  return NextResponse.json({
    evaluatedAt: new Date().toISOString(),
    breached: breaches.length,
    breaches: breaches.map((b) => ({ rule: b.ruleName, kpi: b.kpi, value: b.value, threshold: b.threshold })),
  })
})

export const GET = cronHandler
export const POST = cronHandler