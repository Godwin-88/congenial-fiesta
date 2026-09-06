import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerRole } from '@/lib/secrets/guard'
import { getAdminClient } from '@/lib/admin/require-admin'
import { SECRET_REGISTRY } from '@/lib/secrets/registry'
import { decryptSecret } from '@/lib/secrets/cipher'

/**
 * Pillar 5 — one-way sync of managed secrets to Vercel environment variables.
 *
 * Owner-only. Requires a VERCEL_TOKEN (set as a managed secret itself or in
 * env) plus a VERCEL_PROJECT_ID. This deliberately does NOT read browser
 * values: it resolves the merged (override ∪ env) secret server-side and
 * writes it to Vercel as an encrypted env var via Vercel's REST API.
 */
export async function POST(request: NextRequest) {
  try {
    const owner = await requireOwnerRole()
    const body = await request.json().catch(() => null)
    const projectId = typeof body?.projectId === 'string' ? body.projectId : process.env.VERCEL_PROJECT_ID
    const vercelToken = process.env.VERCEL_TOKEN

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'VERCEL_TOKEN not configured. Set it as a managed secret first (owner → Secrets & Keys → Vercel.TOKEN), then retry.' },
        { status: 400 }
      )
    }
    if (!projectId) {
      return NextResponse.json(
        { error: 'VERCEL_PROJECT_ID not set (env or body). Add it to the request or .env.local.' },
        { status: 400 }
      )
    }

    const supabase = getAdminClient()
    const { data: overrides } = await supabase
      .from('app_secrets')
      .select('service, key, encrypted_value, salt, iv')

    const overrideMap = new Map<string, { encrypted_value: string; salt: string; iv: string }>()
    for (const row of overrides ?? []) {
      overrideMap.set(`${row.service}:${row.key}`, row)
    }

    const synced: string[] = []
    const failed: string[] = []

    for (const def of SECRET_REGISTRY) {
      if (def.serviceSlug === 'vercel') continue // don't sync the sync token itself
      let value = process.env[def.envVar] ?? null
      const ov = overrideMap.get(`${def.serviceSlug}:${def.key}`)
      if (ov) {
        try {
          value = decryptSecret({ value: ov.encrypted_value, salt: ov.salt, iv: ov.iv })
        } catch {
          failed.push(`${def.serviceSlug}.${def.key}`)
          continue
        }
      }
      if (!value) continue // skip unset secrets

      const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: def.envVar,
          value,
          type: def.envVar.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
          target: ['production', 'preview'],
        }),
      })
      if (res.ok || res.status === 400) {
        // 400 = already exists; 409 is fine too. Treat as "synced/exists".
        synced.push(`${def.serviceSlug}.${def.key}`)
      } else {
        failed.push(`${def.serviceSlug}.${def.key} (HTTP ${res.status})`)
      }
    }

    // Audit the sync event.
    try {
      await supabase.from('app_secrets_audit').insert({
        service: 'vercel',
        key: 'ENV_SYNC',
        action: 'set',
        admin_id: owner.id,
      })
    } catch { /* audit is best-effort */ }

    return NextResponse.json({ ok: true, synced, failed })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message.includes('owner') ? 403 : 401 })
  }
}