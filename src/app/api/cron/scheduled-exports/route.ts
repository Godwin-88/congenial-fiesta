import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { sendEmail, isEmailConfigured } from '@/lib/email'
import {
  dueScheduledExports,
  markScheduledExportRun,
  type ScheduledExport,
} from '@/lib/analytics/queries'
import { generateReportCsv, REPORT_LABELS } from '@/lib/analytics/export'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

function preview(csv: string, maxLines = 12): string {
  const lines = csv.split('\n').filter(Boolean)
  return lines.slice(0, maxLines).map((l) => `| ${l}`).join('\n')
}

async function deliverToEmail(job: ScheduledExport, csv: string, reportLabel: string) {
  const recipients = job.recipients.length > 0 ? job.recipients : ADMIN_EMAIL
  if (!recipients) return
  const rows = csv.trim().split('\n').length - 1
  await sendEmail({
    to: recipients,
    subject: `[FweezyTech Analytics] ${reportLabel} — ${job.period} (auto-export)`,
    text: [
      `Scheduled analytics export: ${reportLabel} (${job.period}).`,
      `Rows: ${Math.max(rows, 0)}`,
      '',
      'First rows:',
      preview(csv),
      '',
      `Full CSV: ${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/api/admin/export/${job.report}?period=${job.period}`,
    ].join('\n'),
  })
}

async function deliverToSlack(job: ScheduledExport, csv: string, reportLabel: string) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[exports] SLACK_WEBHOOK_URL not set — skipping slack delivery')
    throw new Error('SLACK_WEBHOOK_URL not configured')
  }
  const rows = csv.trim().split('\n').length - 1
  const resp = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `📊 *${reportLabel}* — ${job.period} (${Math.max(rows, 0)} rows)`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${reportLabel}* — ${job.period}\n${Math.max(rows, 0)} rows` },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `\`\`\`\n${preview(csv, 8)}\n\`\`\`` },
        },
      ],
    }),
  })
  if (!resp.ok) {
    throw new Error(`Slack webhook failed with status ${resp.status}`)
  }
}

const cronHandler = verifySignatureAppRouter(async () => {
  try {
    const due = await dueScheduledExports()
    if (due.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 })
    }

    const results: Array<{ id: number; report: string; ok: boolean; error?: string }> = []

    for (const job of due) {
      try {
        const reportLabel = REPORT_LABELS[job.report] ?? job.report
        const config = job.config as { metric?: string; dimension?: string }
        const { csv } = await generateReportCsv(job.report, {
          period: job.period,
          metric: config.metric,
          dimension: config.dimension,
          limit: 100,
        })

        // Deliver without throwing — capture failure into last_error
        let error: string | null = null
        if (job.destination === 'slack') {
          error = await deliverToSlackSafe(job, csv, reportLabel)
        } else {
          error = await deliverToEmailSafe(job, csv, reportLabel)
        }

        await markScheduledExportRun(job.id, error === null, error)
        results.push({ id: job.id, report: job.report, ok: error === null, error: error ?? undefined })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        await markScheduledExportRun(job.id, false, message)
        results.push({ id: job.id, report: job.report, ok: false, error: message })
      }
    }

    return NextResponse.json({ ok: true, processed: due.length, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
})

async function deliverToEmailSafe(job: ScheduledExport, csv: string, reportLabel: string): Promise<string | null> {
  if (!isEmailConfigured()) return 'SMTP not configured'
  await deliverToEmail(job, csv, reportLabel)
  return null
}

async function deliverToSlackSafe(job: ScheduledExport, csv: string, reportLabel: string): Promise<string | null> {
  try {
    await deliverToSlack(job, csv, reportLabel)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

export const POST = cronHandler