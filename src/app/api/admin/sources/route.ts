import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole } from '@/lib/admin/roles'
import { sourceTypes, authTypes, adapterNames } from '@/lib/devices/source-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sources
 *
 * Source registry (§11): priority, health and bound adapter for every source.
 * Secrets are never stored here — only the NAME of the ENV var (auth_env_key).
 */
export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .order('priority', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [], adapterNames })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

/** POST /api/admin/sources — register a new source (§11a). Admin/owner only. */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const slug = String(body.slug ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const sourceType = String(body.source_type ?? '').trim()

    if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be 2-40 lowercase letters, numbers or dashes.' }, { status: 400 })
    }
    if (name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 })
    }
    if (!sourceTypes.includes(sourceType as (typeof sourceTypes)[number])) {
      return NextResponse.json({ error: 'Unknown source type.' }, { status: 400 })
    }
    const authType = body.auth_type ? String(body.auth_type) : 'none'
    if (!authTypes.includes(authType as (typeof authTypes)[number])) {
      return NextResponse.json({ error: 'Unknown auth type.' }, { status: 400 })
    }
    const adapterName = body.adapter_name ? String(body.adapter_name) : null
    if (adapterName && !(adapterNames as readonly string[]).includes(adapterName)) {
      return NextResponse.json({ error: 'No adapter is bound to that name.' }, { status: 400 })
    }

    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('sources')
      .insert({
        slug,
        name,
        source_type: sourceType,
        base_url: body.base_url ? String(body.base_url) : null,
        api_endpoint: body.api_endpoint ? String(body.api_endpoint) : null,
        auth_type: authType,
        // Only the ENV var NAME is persisted — never the credential itself.
        auth_env_key: body.auth_env_key ? String(body.auth_env_key) : null,
        adapter_name: adapterName,
        priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 50,
        supported_fields: body.supported_fields ?? [],
        active: body.active === undefined ? true : Boolean(body.active),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}