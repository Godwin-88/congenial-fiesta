import { NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'

// GET /api/admin/settings/audit
// Audit trail for secret + config changes (Pillar 1/3). Any admin can view the
// audit log; only owner can mutate entries.
export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = getAdminClient()

    const [secrets, configs] = await Promise.all([
      supabase
        .from('app_secrets_audit')
        .select('id, service, key, action, admin_id, admin_email, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('app_config_audit')
        .select('id, key, action, old_value, new_value, admin_id, admin_email, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const secretsRows = (secrets.data ?? []).map((r) => ({
      id: `s-${r.id}`,
      kind: 'secret' as const,
      target: `${r.service}.${r.key}`,
      action: r.action,
      email: r.admin_email ?? null,
      createdAt: r.created_at,
      detail: null as unknown,
    }))
    const configsRows = (configs.data ?? []).map((r) => ({
      id: `c-${r.id}`,
      kind: 'config' as const,
      target: r.key,
      action: r.action,
      email: r.admin_email ?? null,
      createdAt: r.created_at,
      detail: undefined as unknown,
    }))

    const all = [...secretsRows, ...configsRows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    return NextResponse.json({ events: all })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}