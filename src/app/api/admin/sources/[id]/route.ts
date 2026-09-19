import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { isAdminRole } from '@/lib/admin/roles'
import { sourceTypes, authTypes, adapterNames } from '@/lib/devices/source-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/sources/:id
 *
 * Edit priority, active flag, adapter binding or health metadata (§11a).
 * Admin/owner only. Credentials are never accepted or stored — only the name
 * of the ENV var that holds them.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const sourceId = parseInt(id)
    if (!Number.isFinite(sourceId)) {
      return NextResponse.json({ error: 'Invalid source id' }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (name.length < 2) return NextResponse.json({ error: 'Name is too short.' }, { status: 400 })
      payload.name = name
    }
    if (body.source_type !== undefined) {
      const t = String(body.source_type)
      if (!sourceTypes.includes(t as (typeof sourceTypes)[number])) {
        return NextResponse.json({ error: 'Unknown source type.' }, { status: 400 })
      }
      payload.source_type = t
    }
    if (body.auth_type !== undefined) {
      const t = String(body.auth_type)
      if (!authTypes.includes(t as (typeof authTypes)[number])) {
        return NextResponse.json({ error: 'Unknown auth type.' }, { status: 400 })
      }
      payload.auth_type = t
    }
    if (body.adapter_name !== undefined) {
      const a = body.adapter_name ? String(body.adapter_name) : null
      if (a && !(adapterNames as readonly string[]).includes(a)) {
        return NextResponse.json({ error: 'No adapter is bound to that name.' }, { status: 400 })
      }
      payload.adapter_name = a
    }
    if (body.priority !== undefined) {
      const p = Number(body.priority)
      if (!Number.isFinite(p)) return NextResponse.json({ error: 'Priority must be a number.' }, { status: 400 })
      payload.priority = p
    }
    if (body.active !== undefined) payload.active = Boolean(body.active)
    if (body.base_url !== undefined) payload.base_url = body.base_url ? String(body.base_url) : null
    if (body.api_endpoint !== undefined) payload.api_endpoint = body.api_endpoint ? String(body.api_endpoint) : null
    if (body.auth_env_key !== undefined) payload.auth_env_key = body.auth_env_key ? String(body.auth_env_key) : null
    if (body.supported_fields !== undefined) payload.supported_fields = body.supported_fields ?? []
    if (body.last_error !== undefined) payload.last_error = body.last_error ? String(body.last_error) : null

    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('sources')
      .update(payload)
      .eq('id', sourceId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

/** DELETE /api/admin/sources/:id — deactivate-by-removal, owner/admin only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = await requireAdminAuth()
    if (!isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const sourceId = parseInt(id)
    if (!Number.isFinite(sourceId)) {
      return NextResponse.json({ error: 'Invalid source id' }, { status: 400 })
    }

    const supabase = await getAdminClient()
    const { error } = await supabase.from('sources').delete().eq('id', sourceId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}