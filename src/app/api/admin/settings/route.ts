import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminClient } from '@/lib/admin/require-admin'
import { CONFIG_REGISTRY, defaultConfigMap, getConfigDef } from '@/lib/settings/config'

export async function GET() {
  try {
    await requireAdminAuth()
    const supabase = getAdminClient()

    const [settingsRes, configRes] = await Promise.all([
      supabase.from('site_settings').select('*').limit(1).maybeSingle(),
      supabase.from('app_config').select('key, value'),
    ])

    if (settingsRes.error) {
      return NextResponse.json({ error: settingsRes.error.message }, { status: 500 })
    }

    // Merge stored config over defaults so unset keys always have a value.
    const defaults = defaultConfigMap()
    for (const row of configRes.data ?? []) {
      const def = getConfigDef(row.key)
      if (def) defaults[def.key] = row.value as never
    }

    return NextResponse.json({
      data: settingsRes.data ?? null,
      config: defaults,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdminAuth()
    if (adminUser.role !== 'admin' && adminUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await getAdminClient()

    const payload: Record<string, unknown> = {}
    if (body.score_weight_display !== undefined) payload.score_weight_display = body.score_weight_display
    if (body.score_weight_performance !== undefined) payload.score_weight_performance = body.score_weight_performance
    if (body.score_weight_camera !== undefined) payload.score_weight_camera = body.score_weight_camera
    if (body.score_weight_battery !== undefined) payload.score_weight_battery = body.score_weight_battery
    if (body.score_weight_value !== undefined) payload.score_weight_value = body.score_weight_value
    if (body.admin_email !== undefined) payload.admin_email = body.admin_email?.trim() ?? null
    if (body.advertise_page_indexed !== undefined) payload.advertise_page_indexed = body.advertise_page_indexed

    const weightsSum =
      (typeof payload.score_weight_display === 'number' ? payload.score_weight_display : 0) +
      (typeof payload.score_weight_performance === 'number' ? payload.score_weight_performance : 0) +
      (typeof payload.score_weight_camera === 'number' ? payload.score_weight_camera : 0) +
      (typeof payload.score_weight_battery === 'number' ? payload.score_weight_battery : 0) +
      (typeof payload.score_weight_value === 'number' ? payload.score_weight_value : 0)

    if (
      payload.score_weight_display !== undefined ||
      payload.score_weight_performance !== undefined ||
      payload.score_weight_camera !== undefined ||
      payload.score_weight_battery !== undefined ||
      payload.score_weight_value !== undefined
    ) {
      if (Math.abs(weightsSum - 1) > 0.01) {
        return NextResponse.json(
          { error: `Score weights must sum to 1.00 (currently ${weightsSum.toFixed(2)})` },
          { status: 400 }
        )
      }
    }

    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle()

    let result
    if (existing) {
      result = await supabase
        .from('site_settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('site_settings')
        .insert(payload)
        .select()
        .single()
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    // ── Pillar 3: managed config (app_config) ──────────────────────────────
    const config = (body.config ?? {}) as Record<string, unknown>
    let configUpdated = 0
    for (const [key, value] of Object.entries(config)) {
      const def = getConfigDef(key)
      if (!def) return NextResponse.json({ error: `Unknown config key: ${key}` }, { status: 400 })

      // Validate
      if (def.type === 'boolean' && typeof value !== 'boolean') {
        return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 })
      }
      if (def.type === 'number' && typeof value !== 'number') {
        return NextResponse.json({ error: `${key} must be a number` }, { status: 400 })
      }
      if (def.type === 'url' && typeof value === 'string') {
        const err = def.validate?.(value)
        if (err) return NextResponse.json({ error: `${key}: ${err}` }, { status: 400 })
      }

      const { data: prev } = await supabase.from('app_config').select('value').eq('key', key).maybeSingle()
      if (prev && JSON.stringify(prev.value) === JSON.stringify(value)) continue // unchanged

      const { error: cfgErr } = await supabase.from('app_config').upsert({
        key,
        value: def.type === 'string' ? (value === '' ? def.default : value) : value,
        category: def.category,
        description: def.description,
        updated_by: adminUser.id,
      }, { onConflict: 'key' })
      if (cfgErr) return NextResponse.json({ error: cfgErr.message }, { status: 500 })

      try {
        await supabase.from('app_config_audit').insert({
          key,
          action: 'set',
          old_value: prev?.value ?? null,
          new_value: value,
          admin_id: adminUser.id,
        })
      } catch { /* audit is best-effort */ }
      configUpdated++
    }

    return NextResponse.json({ data: result.data, configUpdated })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 })
  }
}
