import { NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY
const adminEmail = process.env.ADMIN_EMAIL
const resendFrom = process.env.RESEND_FROM_EMAIL ?? 'hello@fweezytech.com'
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = resendApiKey ? new Resend(resendApiKey) : null

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday start
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff - 7) // Previous Monday
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { weekStart: monday, weekEnd: sunday }
}

export const GET = verifySignatureAppRouter(async () => {
  if (!adminEmail) {
    console.error('ADMIN_EMAIL not set — skipping weekly digest')
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 500 })
  }

  if (!resend) {
    console.error('RESEND_API_KEY not set — skipping weekly digest')
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const { weekStart, weekEnd } = getWeekBounds()
  const weekStartStr = formatDate(weekStart)
  const weekEndStr = formatDate(weekEnd)

  // 1. Fetch top 5 devices by affiliate clicks (7d period)
  const { data: topAffiliateData } = await supabase
    .from('affiliate_click_stats')
    .select('device_slug, retailer, click_count')
    .eq('period', '7d')
    .order('click_count', { ascending: false })
    .limit(5)

  // 2. Fetch total page views for the past 7 days
  const { count: totalViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  // 3. Fetch top 5 pages by views from top_content_stats (7d)
  const { data: topPagesData } = await supabase
    .from('top_content_stats')
    .select('path, view_count')
    .eq('period', '7d')
    .order('view_count', { ascending: false })
    .limit(5)

  // 4. Fetch traffic source breakdown (7d)
  const { data: trafficData } = await supabase
    .from('page_views')
    .select('source, platform')
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', weekEnd.toISOString())

  const trafficSources: Record<string, number> = {}
  if (trafficData) {
    for (const row of trafficData) {
      const label = row.platform ? `${row.source} (${row.platform})` : row.source
      trafficSources[label] = (trafficSources[label] ?? 0) + 1
    }
  }

  // Build HTML
  const trafficRows = Object.entries(trafficSources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, views]) => `<tr><td style="color:#D1D5DB;padding:4px 0;">${source}</td><td style="color:#F9FAFB;text-align:right;">${views}</td></tr>`)
    .join('')

  const topPagesRows = topPagesData && topPagesData.length > 0
    ? topPagesData.map((p) => `<li style="color:#D1D5DB;margin-bottom:4px;"><a href="${serverUrl}${p.path}" style="color:#0066FF;">${p.path}</a> — ${p.view_count} views</li>`).join('')
    : '<li style="color:#9CA3AF;">No page view data this week</li>'

  const affiliateRows = topAffiliateData && topAffiliateData.length > 0
    ? topAffiliateData.map((a) => `<li style="color:#D1D5DB;margin-bottom:4px;">${a.device_slug} (${a.retailer}) — ${a.click_count} clicks</li>`).join('')
    : '<li style="color:#9CA3AF;">No affiliate clicks this week</li>'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111827; color: #F9FAFB; padding: 24px; border-radius: 8px;">
      <h1 style="color: #0066FF; font-size: 24px;">FweezyTech Weekly Digest</h1>
      <p style="color: #9CA3AF;">Week of ${weekStartStr} — ${weekEndStr}</p>

      <h2 style="color: #F59E0B; font-size: 18px;">📊 Traffic</h2>
      <p>Total page views: <strong style="color:#F9FAFB;">${totalViews ?? 0}</strong></p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><th style="text-align:left;color:#9CA3AF;padding:4px 0;">Source</th><th style="color:#9CA3AF;text-align:right;">Views</th></tr>
        ${trafficRows || '<tr><td style="color:#9CA3AF;">No data</td><td style="text-align:right;">0</td></tr>'}
      </table>

      <h2 style="color: #F59E0B; font-size: 18px; margin-top: 24px;">🔥 Top Content</h2>
      <ol style="padding-left:20px;">${topPagesRows}</ol>

      <h2 style="color: #F59E0B; font-size: 18px; margin-top: 24px;">💰 Top Affiliate Pages</h2>
      <ol style="padding-left:20px;">${affiliateRows}</ol>

      <p style="color:#9CA3AF; font-size:12px; margin-top:32px;">
        Sent automatically by FweezyTech — <a href="${serverUrl}/admin/analytics" style="color:#0066FF;">View full dashboard</a>
      </p>
    </div>
  `

  try {
    await resend.emails.send({
      from: resendFrom,
      to: adminEmail,
      subject: `FweezyTech Weekly Digest — Week of ${weekStartStr}`,
      html,
    })

    return NextResponse.json({ success: true, sentTo: adminEmail })
  } catch (error) {
    console.error('Failed to send weekly digest:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
})