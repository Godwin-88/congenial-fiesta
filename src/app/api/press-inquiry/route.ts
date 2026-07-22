import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { formRateLimit } from '@/lib/upstash/ratelimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY
const adminEmail = process.env.ADMIN_EMAIL
const resendFrom = process.env.RESEND_FROM_EMAIL ?? 'hello@fweezytech.com'

if (!supabaseUrl) throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceKey) throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = resendApiKey ? new Resend(resendApiKey) : null

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { success } = await formRateLimit.limit(`press-inquiry:${ip}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  let body: {
    name?: string
    publication?: string
    deadline?: string
    message?: string
    email?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const errors: string[] = []

  if (!body.name || body.name.length < 2 || body.name.length > 100) {
    errors.push('Name must be between 2 and 100 characters')
  }
  if (!body.publication || body.publication.length < 2) {
    errors.push('Publication is required')
  }
  if (!body.email || !validateEmail(body.email)) {
    errors.push('Valid email is required')
  }
  if (!body.message || body.message.length < 10 || body.message.length > 2000) {
    errors.push('Message must be between 10 and 2000 characters')
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  // Insert into sponsor_inquiries with budgetRange='press' to differentiate
  const { error: insertError } = await supabase
    .from('sponsor_inquiries')
    .insert({
      name: body.name!.trim(),
      company: body.publication!.trim(),
      budget_range: 'press',
      message: body.message!.trim(),
      email: body.email!.trim(),
      website: body.deadline?.trim() ?? null,
      status: 'new',
    })

  if (insertError) {
    console.error('Failed to insert press inquiry:', insertError)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  // Send notification to admin
  if (resend && adminEmail) {
    try {
      await resend.emails.send({
        from: resendFrom,
        to: adminEmail,
        subject: `Press Inquiry: ${body.publication}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066FF;">New Press Inquiry</h2>
            <table style="width:100%; border-collapse: collapse;">
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.name}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Publication</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.publication}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.email}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Deadline</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.deadline ?? 'N/A'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">Message</td><td style="padding:8px;border-bottom:1px solid #ddd;">${body.message}</td></tr>
            </table>
          </div>
        `,
      })
    } catch (e) {
      console.error('Failed to send press inquiry notification:', e)
    }

    // Send acknowledgement
    try {
      await resend.emails.send({
        from: resendFrom,
        to: body.email!,
        subject: 'We received your press inquiry — FweezyTech',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111827; color: #F9FAFB; padding: 24px; border-radius: 8px;">
            <h2 style="color: #0066FF;">Thanks for reaching out!</h2>
            <p>Hi ${body.name}, thanks for your press inquiry from ${body.publication}. We'll get back to you shortly.</p>
            <p style="color:#9CA3AF;">In the meantime, feel free to download our <a href="/api/media-kit/download" style="color:#0066FF;">media kit</a> for immediate access to assets and stats.</p>
            <p style="color:#9CA3AF; font-size:12px; margin-top:32px;">— The FweezyTech Team</p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Failed to send press acknowledgement:', e)
    }
  }

  return NextResponse.json({ success: true })
}