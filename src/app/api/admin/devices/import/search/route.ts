import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { searchAllSources } from '@/lib/devices/import-agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/devices/import/search
 *
 * Step 1 of the import agent. Runs the query against every ACTIVE source
 * (Phone Database §11a, §12) in parallel and returns per-source candidates.
 * Never writes to the database.
 *
 * Body: { query: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role === 'viewer') {
      return NextResponse.json({ error: 'Your role does not allow importing specs.' }, { status: 403 })
    }

    let body: { query?: string; limit?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const query = String(body.query ?? '').trim()
    if (query.length < 2) {
      return NextResponse.json({ error: 'Enter at least 2 characters to search.' }, { status: 400 })
    }
    if (query.length > 200) {
      return NextResponse.json({ error: 'Search query is too long (max 200 characters).' }, { status: 400 })
    }
    const limit = Math.min(Math.max(Number(body.limit ?? 8) || 8, 1), 20)

    const supabase = await getAdminClient()
    const sources = await searchAllSources(supabase, query, limit)

    return NextResponse.json({
      query,
      sources,
      total: sources.reduce((sum, s) => sum + s.matches.length, 0),
      message: 'Select the correct match per source, then fetch specifications.',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}