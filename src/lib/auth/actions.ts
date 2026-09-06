'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { sendAuthEmail } from '@/lib/auth/emails'
import { sendEmail } from '@/lib/email'

const AUTH_FROM =
  process.env.RESEND_FROM_EMAIL ??
  process.env.MAIL_FROM ??
  'FweezyTech <no-reply@fweezytech.com>'

export async function signInWithMagicLink(email: string, redirectTo?: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const serverUrl = getServerUrl()
  const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${serverUrl}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
  })

  if (error) {
    if (error.message.includes('rate limit') || error.status === 429) {
      return { error: 'Too many magic link requests. Please wait a few minutes before trying again, or check your spam folder if you have already requested a link.' }
    }
    return { error: error.message }
  }
  return {}
}

function getServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  )
}

function makeAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

/**
 * Generate a one-time confirmation/recovery link via the GoTrue Admin API.
 * It operates on the SAME tables Supabase uses (`auth.users`) — it only produces
 * the link; we deliver it through our own email stack so Supabase's built-in
 * emailer (which rate-limits: `over_email_send_rate_limit`) is never required.
 */
async function generateAuthLink(
  email: string,
  type: 'signup' | 'recovery',
  password?: string
): Promise<{ link?: string; error?: string }> {
  const adminClient = makeAdminClient()

  const result =
    type === 'signup'
      ? await adminClient.auth.admin.generateLink({
          type: 'signup',
          email,
          password: password ?? '',
          options: { redirectTo: `${getServerUrl()}/auth/callback` },
        })
      : await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${getServerUrl()}/auth/reset-password` },
        })

  if (result.error) return { error: result.error.message }

  // `action_link` is GoTrue's /auth/v1/verify?token=…&type=…&redirect_to=…
  // Hitting that page directly can surface raw GoTrue JSON on failure (the
  // "Verify requires a verification type" 400). Instead we extract the
  // short-lived `token` and build a link straight to OUR OWN pages, where the
  // verify step runs inside our branded UI with an explicit `type` — no raw
  // JSON possible, and the user always lands on the intended screen.
  const actionLink = result.data?.properties?.action_link
  if (!actionLink) return { error: 'Could not generate a confirmation link.' }
  const token = new URL(actionLink).searchParams.get('token')
  if (!token) return { error: 'Could not generate a verification token.' }

  if (type === 'recovery') {
    const u = new URL(`${getServerUrl()}/auth/reset-password`)
    u.searchParams.set('token_hash', token)
    u.searchParams.set('type', 'recovery')
    u.searchParams.set('email', email)
    return { link: u.toString() }
  }

  const u = new URL(`${getServerUrl()}/auth/callback`)
  u.searchParams.set('token_hash', token)
  u.searchParams.set('type', 'signup')
  u.searchParams.set('email', email)
  return { link: u.toString() }
}

async function findUserByEmail(email: string) {
  const adminClient = makeAdminClient()
  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
}

/**
 * Sign up and send a CONFIRMATION LINK before first sign-in.
 *
 * Flow:
 *   1. create account   → `admin.createUser({ email_confirm: false })` (auth.users)
 *   2. confirmation link → `admin.generateLink(type: 'signup')`, delivered via our
 *                          own email stack (Resend → SMTP). Supabase's rate-limited
 *                          emailer is never in the path.
 *   3. first sign-in    → user clicks the link, then signs in with email + password.
 *
 * If the email already exists on the same auth.users table but is still
 * unconfirmed (e.g. an earlier attempt whose email was rate-limited away) we
 * adopt the row and send a fresh confirmation link. Confirmed accounts are
 * never overwritten.
 */
export async function signUpWithEmail(email: string, password: string, redirectTo?: string): Promise<{ error?: string; needsVerification?: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = await createClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // No service-role key → standard Supabase signup (Supabase sends the email).
  if (!serviceRoleKey) {
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${getServerUrl()}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
    })
    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        return { error: 'Too many sign-up attempts. Please wait a few minutes before trying again.' }
      }
      return { error: error.message }
    }
    return { needsVerification: true }
  }

  let created = false
  try {
    const { data: { user }, error } = await makeAdminClient().auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
    })

    if (error) {
      const alreadyExists =
        error.status === 422 ||
        error.message.includes('already been registered') ||
        error.message.includes('already exists') ||
        error.message.includes('UserAlreadyExists')

      if (!alreadyExists) return { error: error.message }

      const existing = await findUserByEmail(cleanEmail)
      if (!existing) return { error: 'An account with that email already exists. Try signing in instead.' }
      if (existing.email_confirmed_at) {
        return { error: 'An account with that email already exists. Try signing in instead.' }
      }
      // Unconfirmed existing row → send a fresh confirmation link below.
    } else if (!user?.id) {
      return { error: 'Account could not be created. Please try again.' }
    } else {
      created = true
    }
  } catch (e) {
    console.error('[auth] admin.createUser failed, falling back to standard signup:', e)
    const { error: fbError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${getServerUrl()}/auth/callback?next=${encodeURIComponent(redirectTo ?? '/')}`,
      },
    })
    if (fbError) return { error: fbError.message }
    return { needsVerification: true }
  }

  void created // (kept for readability; both paths send the link below)

  const { link, error: linkError } = await generateAuthLink(cleanEmail, 'signup', password)
  if (linkError || !link) {
    return { error: linkError ?? 'Account created, but no confirmation link could be generated.' }
  }
  const sent = await sendAuthEmail({
    to: cleanEmail,
    subject: 'Confirm your FweezyTech account',
    headline: 'Confirm your email',
    body: 'You created an account on FweezyTech. Confirm your email address to activate it — then sign in with the password you chose.',
    ctaLabel: 'Confirm my account',
    ctaUrl: link,
  })
  if (!sent.sent) {
    return { error: 'Account created, but the confirmation email could not be delivered. Please contact support.' }
  }

  return { needsVerification: true }
}

/** Resend the signup confirmation link (delivered via our own email stack). */
export async function resendConfirmationLink(email: string): Promise<{ error?: string; sent?: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Confirmation resend is unavailable right now. Please try signing up again.' }
  }

  const existing = await findUserByEmail(cleanEmail)
  if (!existing) return { error: 'No account found for that email.' }
  if (existing.email_confirmed_at) return { error: 'That email is already confirmed. You can sign in.' }

  // The user already exists (unconfirmed) with their chosen password set at
  // signup, so no password needs to be passed to generate an existing-user
  // confirmation link.
  const { link, error: linkError } = await generateAuthLink(cleanEmail, 'signup')
  if (linkError || !link) return { error: linkError ?? 'Could not generate a new confirmation link.' }

  const sent = await sendAuthEmail({
    to: cleanEmail,
    subject: 'Confirm your FweezyTech account',
    headline: 'Confirm your email',
    body: 'Here is a fresh confirmation link for your FweezyTech account.',
    ctaLabel: 'Confirm my account',
    ctaUrl: link,
  })
  if (!sent.sent) return { error: sent.error ?? 'Could not deliver the confirmation email.' }
  return { sent: true }
}

export async function signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }
  return {}
}

/**
 * Request a password reset. PREFERS a confirmation link generated via the
 * Admin API (`generateLink(type: 'recovery')`) and delivered through our own
 * email stack — the fallback for Supabase's built-in emailer. Without a
 * service-role key we fall back to `resetPasswordForEmail` (Supabase sends it).
 */
export async function resetPassword(email: string): Promise<{ error?: string }> {
  const cleanEmail = email.trim().toLowerCase()

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { link, error: linkError } = await generateAuthLink(cleanEmail, 'recovery')
    if (!linkError && link) {
      const sent = await sendAuthEmail({
        to: cleanEmail,
        subject: 'Reset your FweezyTech password',
        headline: 'Password reset request',
        body: 'We received a request to reset your password. Use the link below to choose a new one. If you did not request this, you can safely ignore this email.',
        ctaLabel: 'Reset my password',
        ctaUrl: link,
      })
      if (sent.sent) return {}

      // Our own delivery (Resend -> SMTP) failed. Log the REAL reason so Vercel
      // logs can be debugged (e.g. missing RESEND_API_KEY / SMTP creds, or an
      // unverified Resend sender domain), then fail-open to Supabase's native
      // emailer so the user still receives a reset link if it's able to send.
      console.error('[auth] Self-hosted reset email failed:', sent.error ?? 'unknown')

      const supabase = await createClient()
      const { error: supabaseErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${getServerUrl()}/auth/reset-password`,
      })
      if (!supabaseErr) return {}
      console.error('[auth] Supabase reset email fallback also failed:', supabaseErr.message)
    }
    // No leak: if the email isn't registered (linkError), still report success.
    return {}
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${getServerUrl()}/auth/reset-password`,
  })
  if (error) return { error: error.message }
  return {}
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Send a magic-link OTP code to the user's email for sign-in.
 *
 * Uses the GoTrue Admin API (`generateLink` with `type: 'magiclink'`), which
 * returns BOTH an action link AND a short-lived `email_otp` code. We deliver
 * the code through our own email stack (Resend → SMTP) so Supabase's
 * rate-limited built-in emailer is never required. Falls back to
 * `signInWithOtp` (Supabase's emailer) when no service-role key is configured.
 */
export async function sendOtpCode(
  email: string,
  redirectTo?: string
): Promise<{ error?: string; sent?: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return { error: 'Please enter your email.' }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = makeAdminClient()
    const { data, error: genError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: cleanEmail,
      options: {
        redirectTo: redirectTo ? `${getServerUrl()}${redirectTo}` : undefined,
      },
    })

    if (genError || !data) {
      return { error: genError?.message ?? 'Could not generate an OTP code.' }
    }

    const otpCode = data.properties?.email_otp
    if (!otpCode) {
      console.error('[auth] generateLink(magiclink) returned no email_otp property')
      return { error: 'Could not generate an OTP code. Please try again.' }
    }

    const sent = await sendEmail({
      to: cleanEmail,
      subject: 'Your FweezyTech sign-in code',
      from: AUTH_FROM,
      html: `<p style="font-size:16px;line-height:1.6;">Your FweezyTech sign-in code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:4px;">${otpCode}</p><p style="font-size:14px;color:#666;">Enter this code to sign in. It expires in 10 minutes.</p>`,
      text: `Your FweezyTech sign-in code is: ${otpCode}\nEnter this code to sign in. It expires in 10 minutes.`,
    })

    if (!sent.sent) {
      return { error: sent.error ?? 'Could not deliver the OTP email. Please try again.' }
    }
    return { sent: true }
  }

  // No service-role key → use Supabase's built-in OTP delivery.
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectTo ? `${getServerUrl()}${redirectTo}` : undefined,
    },
  })
  if (error) return { error: error.message }
  return { sent: true }
}

/**
 * Verify a 6-digit OTP code and sign the user in.
 * Uses the server-side supabase client (with cookies) so the session cookie
 * is set automatically on success.
 */
export async function verifyOtpCode(
  email: string,
  token: string,
  redirectTo?: string
): Promise<{ error?: string; success?: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token,
    type: 'email',
  })

  if (error) return { error: error.message }
  return { success: true }
}
