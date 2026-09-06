import { NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole } from '@/lib/admin/roles'
import { publishJob } from '@/lib/upstash/qstash'

export const maxDuration = 30

/**
 * Admin-triggered device import from the FweezyTech YouTube channel.
 *
 * The heavy lifting (Groq extraction + image curation) can take minutes, so
 * we never run it inline in a browser request. Instead we publish a one-off
 * QStash job to the existing cron route which runs the agent pipeline in the
 * background and creates DRAFTS for admin review.
 *
 * Body: { fetchAll?: boolean }
 *   - fetchAll=false (default) -> latest 50 videos (RSS + Innertube merge)
 *   - fetchAll=true            -> scan the whole channel via the Data API
 *                                 (or deep Innertube pagination when the API
 *                                 key is not configured)
 */
export async function POST(req: Request) {
  const adminUser = await requireAdminAuth()
  if (!isAdminRole(adminUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  let body: { fetchAll?: boolean } = {}
  try {
    body = (await req.json()) as { fetchAll?: boolean }
  } catch {
    body = {}
  }
  const fetchAll = body.fetchAll === true

  // Duplicate-trigger guard: refuse to queue a second import within 5 minutes
  // of the last one, so a double-click or a concurrent tab can't spawn
  // overlapping agent runs that process the same videos twice.
  const supabase = getAdminClient()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('agent_run_log')
    .select('id, created_at, summary')
    .eq('agent', 'import-youtube')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: 'An import already ran within the last 5 minutes', recent: recent[0] },
      { status: 409 },
    )
  }

  try {
    await publishJob(`${serverUrl}/api/cron/import-youtube-devices`, {
      source: 'admin',
      fetchAll,
    })
  } catch (err) {
    console.error('Failed to queue YouTube device import:', err)
    return NextResponse.json(
      { error: 'Failed to queue import. Check QSTASH_TOKEN / NEXT_PUBLIC_SERVER_URL.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    queued: true,
    scope: fetchAll ? 'all' : 'latest-50',
  })
}