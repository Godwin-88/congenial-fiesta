import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { purgeExpiredRawEvents } from '@/lib/analytics/queries'

// Monthly retention sweep (QStash, 1st of month 06:00 UTC): hard-delete raw
// analytics events past their per-table TTL (see retention_policy). The
// append-only data_retention_log records every run for DPA accountability.
const cronHandler = verifySignatureAppRouter(async () => {
  const result = await purgeExpiredRawEvents(false, 'cron')

  return NextResponse.json({
    purgedAt: new Date().toISOString(),
    total: result.total,
    purged: result.purged,
  })
})

export const GET = cronHandler
export const POST = cronHandler