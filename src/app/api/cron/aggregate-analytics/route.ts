import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function aggregateAffiliateClicks() {
  const periods: Array<{ period: string; interval: string }> = [
    { period: '7d', interval: '7 days' },
    { period: '30d', interval: '30 days' },
    { period: '90d', interval: '90 days' },
    { period: 'all', interval: '100 years' }, // effectively all time
  ]

  for (const { period, interval } of periods) {
    const { data } = await supabase
      .from('affiliate_clicks')
      .select('device_slug, retailer')
      .gte('created_at', `now() - interval '${interval}'`)

    if (!data) continue

    // Group by device_slug + retailer
    const grouped: Record<string, number> = {}
    for (const row of data) {
      const key = `${row.device_slug}:${row.retailer}`
      grouped[key] = (grouped[key] ?? 0) + 1
    }

    // Upsert into affiliate_click_stats
    for (const [key, count] of Object.entries(grouped)) {
      const [deviceSlug, retailer] = key.split(':')
      await supabase
        .from('affiliate_click_stats')
        .upsert({
          device_slug: deviceSlug,
          retailer,
          period,
          click_count: count,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'device_slug, retailer, period',
        })
    }
  }
}

async function aggregateTopContent() {
  const periods: Array<{ period: string; interval: string }> = [
    { period: '7d', interval: '7 days' },
    { period: '30d', interval: '30 days' },
    { period: '90d', interval: '90 days' },
  ]

  for (const { period, interval } of periods) {
    const { data } = await supabase
      .from('page_views')
      .select('path')
      .gte('created_at', `now() - interval '${interval}'`)

    if (!data) continue

    // Group by path
    const grouped: Record<string, number> = {}
    for (const row of data) {
      grouped[row.path] = (grouped[row.path] ?? 0) + 1
    }

    // Upsert into top_content_stats
    for (const [path, count] of Object.entries(grouped)) {
      // Sort by view count descending and take top 50
      await supabase
        .from('top_content_stats')
        .upsert({
          path,
          period,
          view_count: count,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'path, period',
        })
    }
  }
}

export const GET = verifySignatureAppRouter(async () => {
  // 1. Refresh materialized view
  try {
    await supabase.rpc('refresh_daily_summary')
  } catch (e) {
    console.error('Failed to refresh materialized view:', e)
  }

  // 2. Aggregate affiliate clicks per period
  try {
    await aggregateAffiliateClicks()
  } catch (e) {
    console.error('Failed to aggregate affiliate clicks:', e)
  }

  // 3. Aggregate top content per period
  try {
    await aggregateTopContent()
  } catch (e) {
    console.error('Failed to aggregate top content:', e)
  }

  return NextResponse.json({
    success: true,
    aggregatedAt: new Date().toISOString(),
  })
})