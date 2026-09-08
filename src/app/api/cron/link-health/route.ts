import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUrl(url: string): Promise<{ statusCode: number | null; ok: boolean }> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
      headers: {
        'user-agent': 'fweezytech-linkhealth/1.0',
      },
    })
    const status = res.status
    // 2xx or 3xx redirect = healthy; 4xx/5xx = broken
    return { statusCode: status, ok: status < 400 }
  } catch {
    return { statusCode: null, ok: false }
  }
}

const cronHandler = verifySignatureAppRouter(async () => {
  // 1. Pull every published device's buy_links (JSONB array of { retailer, url }).
  const { data: devices, error } = await supabase
    .from('devices')
    .select('slug, buy_links')
    .eq('status', 'published')
    .not('buy_links', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Flatten into { deviceSlug, retailer, url } rows; skip empty/invalid URLs.
  const rows: Array<{ deviceSlug: string; retailer: string; url: string }> = []
  for (const device of devices ?? []) {
    const links = Array.isArray(device.buy_links) ? device.buy_links : []
    for (const link of links) {
      const retailer = String(link?.retailer ?? '').trim()
      const url = String(link?.url ?? '').trim()
      if (!retailer || !url || !url.startsWith('http')) continue
      rows.push({ deviceSlug: String(device.slug), retailer, url })
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: true, checked: 0, message: 'No buy links to check' })
  }

  // 3. Check sequentially-ish in small batches to be polite to affiliate servers.
  const checked: Array<{ deviceSlug: string; retailer: string; url: string; statusCode: number | null; ok: boolean }> = []
  const BATCH = 5
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (row) => {
      const { statusCode, ok } = await checkUrl(row.url)
      return { ...row, statusCode, ok }
    }))
    checked.push(...results)
  }

  // 4. Upsert into link_health_checks (keyed on unique url).
  for (const row of checked) {
    await supabase.from('link_health_checks').upsert(
      {
        device_slug: row.deviceSlug,
        retailer: row.retailer,
        url: row.url,
        status_code: row.statusCode,
        ok: row.ok,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'url' },
    )
  }

  const broken = checked.filter((r) => !r.ok).length
  return NextResponse.json({
    success: true,
    checked: checked.length,
    broken,
    timestamp: new Date().toISOString(),
  })
})

export const GET = cronHandler
export const POST = cronHandler