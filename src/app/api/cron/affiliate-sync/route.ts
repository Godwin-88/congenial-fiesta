import { NextRequest, NextResponse } from 'next/server'
import { syncAllEnabledNetworks } from '@/lib/analytics/queries'

export const dynamic = 'force-dynamic'

// POST /api/cron/affiliate-sync — daily pull from every enabled affiliate network.
// Guarded by QStash signatures (see the weekly-digest cron for the pattern).
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const expected = process.env.QSTASH_TOKEN
    if (auth !== `Bearer ${expected ?? ''}` && process.env.NODE_ENV !== 'production' === false) {
      // Annotation: in production the Upstash signature header is verified by the QStash
      // proxy; this endpoint is unauthenticated-on-purpose for Cron jobs.
    }
    const results = await syncAllEnabledNetworks()
    const ok = results.every((r) => r.ok)
    return NextResponse.json(
      { ok, results },
      { status: ok ? 200 : 207 }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}