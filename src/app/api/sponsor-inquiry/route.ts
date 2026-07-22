import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { formRateLimit } from '@/lib/upstash/ratelimit'

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

const ALLOWED_BUDGET_RANGES = [
  'Under $500',
  '$500–$2,000',
  '$2,000–$5,000',
  '$5,000–$10,000',
  '$10,000+',
  'press',
]

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await formRateLimit.limit(`sponsor-inquiry:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let body: {
    name?: string
    company?: string
    website?: string
    budgetRange?: string
    message?: string
    email?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate
  const errors: string[] = []

  if (!body.name || body.name.length < 2 || body.name.length > 100) {
    errors.push('Name must be between 2 and 100 characters')
  }
  if (!body.company || body.company.length < 2 || body.company.length > 100) {
    errors.push('Company must be between 2 and 100 characters')
  }
  if (!body.email || !validateEmail(body.email)) {
    errors.push('Valid email is required')
  }
  if (!body.budgetRange || !ALLOWED_BUDGET_RANGES.includes(body.budgetRange)) {
    errors.push('Budget range must be one of: ' + ALLOWED_BUDGET_RANGES.join(', '))
  }
  if (!body.message || body.message.length < 10 || body.message.length > 2000) {
    errors.push('Message must be between 10 and 2000 characters')
  }
  if (body.website && !validateUrl(body.website)) {
    errors.push('Website must be a valid URL')
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  // Insert into Supabase
  const { data: inserted, error: insertError } = await supabase
    .from('sponsor_inquiries')
    .insert({
      name: body.name!.trim(),
      company: body.company!.trim(),
      website: body.website?.trim() ?? null,
      budget_range: body.budgetRange!,
      message: body.message!.trim(),
      email: body.email!.trim(),
      status: 'new',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to insert sponsor inquiry:', insertError)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  // Send notification email to admin
  if (resend && adminEmail) {
    try {
      await resend.emails.send({
        from: resendFrom,
        to: adminEmail,
        subject: `New Sponsor Inquiry: ${body.company} — ${body.budgetRange}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066FF;">New Sponsor Inquiry</h2>
            <table style="width:100%; border-collapse: collapse;">
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Company</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.company}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.name}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.email}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Website</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.website ?? 'N/A'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Budget Range</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.budgetRange}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Message</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.message}</td></tr>
            </table>
            <p style="margin-top:16px;">
              <a href="${serverUrl}/admin/analytics" style="color:#0066FF;">View in dashboard</a>
            </p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Failed to send admin notification:', e)
    }

    // Send acknowledgement to submitter
    try {
      await resend.emails.send({
        from: resendFrom,
        to: body.email!,
        subject: 'We got your message — FweezyTech',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111827; color: #F9FAFB; padding: 24px; border-radius: 8px;">
            <h2 style="color: #0066FF;">Thanks for reaching out, ${body.name}!</h2>
            <p>Hi ${body.name}, thanks for reaching out about a partnership with FweezyTech. We'll review your inquiry and get back to you within 3 business days.</p>
            <p style="color:#9CA3AF;">In the meantime, feel free to check out our <a href="${serverUrl}/press" style="color:#0066FF;">press resources</a>.</p>
            <p style="color:#9CA3AF; font-size:12px; margin-top:32px;">— The FweezyTech Team</p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Failed to send acknowledgement:', e)
    }
  }

  return NextResponse.json({ success: true })
}