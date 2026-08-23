import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { sendEmail, isEmailConfigured } from '@/lib/email'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  analytics: true,
})

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = getAdminSupabase()

    // Find all active coming-soon items
    const { data: comingSoonItems } = await supabase
      .from('coming_soon')
      .select('*')
      .eq('active', true)
      .limit(50)

    if (comingSoonItems) {
      for (const item of comingSoonItems) {
        const existingEmails = (item.notify_emails as Array<{ email: string }>) ?? []
        const alreadySubscribed = existingEmails.some((e: { email: string }) => e.email === email)
        if (!alreadySubscribed) {
          await supabase
            .from('coming_soon')
            .update({
              notify_emails: [...existingEmails, { email }],
              notify_count: (item.notify_count ?? 0) + 1,
            })
            .eq('id', item.id)
        }
      }
    }

    // Send confirmation email via SMTP (Gmail app password)
    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: email,
          subject: "You're on the list — FweezyTech",
          html: `<p>Hey!</p><p>You'll be the first to know when Fweezy drops his next review. Stay tuned.</p>`,
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Non-fatal — don't block the response
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notify API error:', error)
    return NextResponse.json({ success: false, error: 'Something went wrong' }, { status: 500 })
  }
}