import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getRedisOrThrow } from '@/lib/upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: getRedisOrThrow(),
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  analytics: true,
})

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

    const payload = await getPayload({ config })

    // Find all active coming-soon items
    const comingSoonItems = await payload.find({
      collection: 'coming-soon',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { active: { equals: true } } as any,
      limit: 50,
      depth: 0,
    })

    // Add email to each active item
    for (const item of comingSoonItems.docs) {
      const existingEmails = (item as unknown as { notifyEmails?: { email: string }[] }).notifyEmails ?? []
      const alreadySubscribed = existingEmails.some((e: { email: string }) => e.email === email)
      if (!alreadySubscribed) {
        await payload.update({
          collection: 'coming-soon',
          id: item.id,
          data: {
            notifyEmails: [...existingEmails, { email }],
            notifyCount: (item as unknown as { notifyCount: number }).notifyCount + 1,
          },
        })
      }
    }

    // Send confirmation email via Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
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