import { NextRequest, NextResponse } from 'next/server'
import { requireOwnerRole } from '@/lib/secrets/guard'
import { getAdminClient } from '@/lib/admin/require-admin'
import { SECRET_REGISTRY, envValueFor, findByEnv } from '@/lib/secrets/registry'
import { encryptSecret, maskSecret } from '@/lib/secrets/cipher'
import { invalidateSecret } from '@/lib/secrets/runtime'

/**
 * Secrets Vault API (Pillar 1). Owner-only.
 *
 * GET    → registry × current state, values always MASKED (never round-trip)
 * PATCH  → write-only set: encrypt & store; value is discarded after use
 * DELETE → remove the DB override (falls back to env); body { service, key }
 */
export async function GET() {
  try {
    const admin = await requireOwnerRole()
    const supabase = getAdminClient()

    const { data: overrides, error } = await supabase
      .from('app_secrets')
      .select('service, key, updated_at, updated_by')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const overrideMap = new Map<string, { updated_at: string; updated_by: string | null }>()
    for (const row of overrides ?? []) {
      overrideMap.set(`${row.service}:${row.key}`, row)
    }

    const defs = SECRET_REGISTRY.map((def) => {
      const envValue = envValueFor(def) ?? null
      const ov = overrideMap.get(`${def.serviceSlug}:${def.key}`)
      return {
        service: def.service,
        serviceSlug: def.serviceSlug,
        key: def.key,
        envVar: def.envVar,
        category: def.category,
        description: def.description,
        field: def.field,
        required: def.required,
        // NEVER the plaintext — only whether a value exists + a masked hint.
        hasValue: Boolean(envValue || ov),
        masked: ov ? maskSecret('••override••') : maskSecret(envValue ?? undefined),
        source: ov ? ('override' as const) : ('env' as const),
        updatedAt: ov?.updated_at ?? null,
        updatedBy: ov?.updated_by ?? null,
      }
    })

    return NextResponse.json({ defs, actorRole: admin.role })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message.includes('owner') ? 403 : 401 })
  }
}

// PATCH { service, key, value } — write-only credential upsert
export async function PATCH(request: NextRequest) {
  try {
    await requireOwnerRole()
    const body = await request.json().catch(() => null)
    const { service, key, value } = body ?? {}
    if (typeof service !== 'string' || typeof key !== 'string' || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ error: 'service, key and a non-empty value are required' }, { status: 400 })
    }

    const def = SECRET_REGISTRY.find((d) => d.serviceSlug === service && d.key === key)
    if (!def) return NextResponse.json({ error: `Unknown credential (${service}.${key})` }, { status: 400 })

    const enc = encryptSecret(value)
    const supabase = getAdminClient()

    const { error } = await supabase
      .from('app_secrets')
      .upsert(
        {
          service,
          key,
          encrypted_value: enc.value,
          salt: enc.salt,
          iv: enc.iv,
        },
        { onConflict: 'service,key' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit
    try {
      await supabase.from('app_secrets_audit').insert({
        service,
        key,
        action: 'set',
        admin_id: (await requireOwnerRole()).id,
      })
    } catch { /* audit is best-effort */ }

    // Purge the runtime cache so consumers pick up the new value.
    invalidateSecret(def.envVar)

    return NextResponse.json({ ok: true, service, key, source: 'override' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message.includes('owner') ? 403 : 401 })
  }
}

// DELETE { service, key } — remove the override (revert to env)
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireOwnerRole()
    const body = await request.json().catch(() => null)
    const { service, key } = body ?? {}
    if (typeof service !== 'string' || typeof key !== 'string') {
      return NextResponse.json({ error: 'service and key are required' }, { status: 400 })
    }
    const def = findByEnv?.(`${service}.${key}`) // no-op; we validate below
    const known = SECRET_REGISTRY.find((d) => d.key === key)
    void def
    if (!known) return NextResponse.json({ error: `Unknown credential (${key})` }, { status: 400 })

    const supabase = getAdminClient()
    const { error } = await supabase.from('app_secrets').delete().eq('service', service).eq('key', key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await supabase.from('app_secrets_audit').insert({
        service,
        key,
        action: 'reset',
        admin_id: admin.id,
      })
    } catch { /* audit is best-effort */ }
    invalidateSecret(known.envVar)

    return NextResponse.json({ ok: true, service, key, source: 'env' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message.includes('owner') ? 403 : 401 })
  }
}