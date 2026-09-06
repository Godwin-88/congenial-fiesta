import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin/require-admin'
import { runPrefillExtraction } from '@/lib/chat/prefill-prompt'
import { prefillCollections, type PrefillCollection } from '@/lib/chat/prefill-schemas'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/prefill
 *
 * Agentic form prefill. Converts pasted device specs / article copy or a
 * natural-language request into a *structured* form payload (DevicePrefill |
 * ArticlePrefill) that the admin can review and apply to the create/edit form.
 *
 * Security:
 *  - Admin/editor only (viewers get 403) — the "respective roles" gate.
 *  - Never writes to the database — this route only stages form fields.
 *  - Rate-limited + input-capped so the shared LLM budget isn't abused.
 */
export async function POST(req: NextRequest) {
  // ── 1. Config + auth (admin/editor only) ─────────────────────
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured. GROQ_API_KEY is missing.' }, { status: 500 })
  }

  const adminUser = await getAdminUser().catch(() => null)
  if (!adminUser) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 403 })
  }
  // "respect respective roles": viewers can read content in the admin but must
  // not use the AI to stage content (only admins/editors can create/edit).
  if (adminUser.role === 'viewer') {
    return NextResponse.json({ error: 'Your role does not allow AI-assisted form filling.' }, { status: 403 })
  }

  // ── 2. Parse + validate input ────────────────────────────────
  let body: { collection?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { collection, source } = body
  if (!collection || !prefillCollections.includes(collection as PrefillCollection)) {
    return NextResponse.json({ error: 'Unknown collection. Allowed: ' + prefillCollections.join(', ') }, { status: 400 })
  }
  const text = (source ?? '').trim()
  if (text.length < 3) {
    return NextResponse.json({ error: 'Please paste some source text (at least 3 characters).' }, { status: 400 })
  }
  if (text.length > 6000) {
    return NextResponse.json({ error: 'Source text is too long (max 6000 characters).' }, { status: 400 })
  }

  // ── 3. Lightweight rate limit (Redis) ─────────────────────────
  try {
    const { redis, isRedisConfigured } = await import('@/lib/upstash/redis')
    if (isRedisConfigured) {
      const key = `prefill:rl:${adminUser.id}`
      const count = Number((await redis.get(key)) ?? 0)
      if (count >= 20) {
        return NextResponse.json({ error: 'Prefill rate limit reached. Try again in a minute.' }, { status: 429 })
      }
      await redis.set(key, count + 1, { ex: 60 })
    }
  } catch {
    // rate-limit failure is non-fatal
  }

  // ── 4. Run Groq extraction ───────────────────────────────────
  const result = await runPrefillExtraction(collection as PrefillCollection, text)
  if (!result) {
    return NextResponse.json(
      { error: 'Could not extract fields. The AI service may be unavailable — please try again shortly.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    collection: result.collection,
    fields: result.fields,
    usage: result.usage,
    message: 'Fields ready for review. Confirm below and apply to the form.',
  })
}