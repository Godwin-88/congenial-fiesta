import { Resend } from 'resend'
import { sendEmail } from '@/lib/email'

const AUTH_FROM =
  process.env.RESEND_FROM_EMAIL ??
  process.env.MAIL_FROM ??
  'FweezyTech <no-reply@fweezytech.com>'

const BRAND_NAME = 'FweezyTech'
const BRAND_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://fweezytech.com'

export interface AuthEmailResult {
  sent: boolean
  error?: string
}

function emailHtml(opts: {
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
}): string {
  const { headline, body, ctaLabel, ctaUrl } = opts
  // HTML-escape the URL so the href can never break out of the attribute,
  // while PRESERVING query-string separators (`&` → `&amp;`, which browsers
  // decode back to `&` on click). The old `.replace(/[<>&'"]/g, '')` deleted
  // every `&` — mangling `?token=…&type=recovery&email=…` into one broken
  // parameter, which made the reset/confirm link unusable.
  const safeUrl = ctaUrl
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6">
      <tr>
        <td align="center" style="padding:40px 0">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;overflow:hidden">
            <tr>
              <td style="padding:28px 32px;background:#0f172a;color:#ffffff;font-size:20px;font-weight:bold">${BRAND_NAME}</td>
            </tr>
            <tr>
              <td style="padding:32px 32px">
                <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a">${headline}</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">${body}</p>
                <a href="${safeUrl}" style="display:inline-block;margin:0 0 24px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px">${ctaLabel}</a>
                <p style="margin:0 0 8px;font-size:12px;color:#64748b">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin:0;font-size:12px;color:#2563eb;word-break:break-all">${safeUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
                You received this email because someone used your address on ${BRAND_NAME} (${BRAND_URL}). If this wasn't you, you can safely ignore this message.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * Send an auth email (confirmation link / password reset). Prefers the
 * Resend HTTP API when RESEND_API_KEY is present, otherwise falls back to
 * the SMTP transporter used across the rest of the app (nodemailer).
 *
 * This is the "fallback for Supabase": the delivery path is entirely ours,
 * so Supabase's built-in emailer (which rate-limits — `over_email_send_rate_limit`)
 * can never prevent a user from getting their confirmation/reset link.
 */
export async function sendAuthEmail(opts: {
  to: string
  subject: string
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
}): Promise<AuthEmailResult> {
  const html = emailHtml(opts)

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const { data, error } = await resend.emails.send({
        from: AUTH_FROM,
        to: [opts.to],
        subject: opts.subject,
        html,
      })
      if (error) {
        console.error('[auth-email] Resend failed:', error.message)
        // fall through to SMTP below
      } else {
        return { sent: true }
      }
    } catch (err) {
      console.error('[auth-email] Resend threw:', err instanceof Error ? err.message : String(err))
    }
  }

  const smtp = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html,
    text: `${opts.headline}\n\n${opts.body}\n\n${opts.ctaLabel}: ${opts.ctaUrl}`,
    from: AUTH_FROM,
  })

  if (smtp.sent) return { sent: true }
  return { sent: false, error: smtp.error ?? 'Email delivery is not configured.' }
}

/**
 * Send an email OTP sign-in code. PREFERS the Resend HTTP API (verified
 * sender domain — reliable, no SMTP auth quirks) and falls back to SMTP only
 * when Resend is unavailable. Previously this path went STRAIGHT to SMTP,
 * which for smtp.gmail.com rejected any non-@gmail.com sender with
 * `534-5.7.9 Please log in with your web browser and then try again`.
 */
export async function sendOtpEmail(opts: {
  to: string
  otp: string
}): Promise<AuthEmailResult> {
  const { to, otp } = opts
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6">
      <tr>
        <td align="center" style="padding:40px 0">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;overflow:hidden">
            <tr>
              <td style="padding:28px 32px;background:#0f172a;color:#ffffff;font-size:20px;font-weight:bold">${BRAND_NAME}</td>
            </tr>
            <tr>
              <td style="padding:32px 32px">
                <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a">Your sign-in code</h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">Use the code below to sign in to ${BRAND_NAME}. It expires in 10 minutes.</p>
                <p style="margin:24px auto;font-size:32px;font-weight:bold;letter-spacing:6px;color:#0f172a;text-align:center;background:#f1f5f9;border-radius:8px;padding:16px 0">${otp}</p>
                <p style="margin:0 0 8px;font-size:12px;color:#64748b">If you did not request this code, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0">
                You received this email because someone used your address on ${BRAND_NAME} (${BRAND_URL}).
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  const text = `Your FweezyTech sign-in code is: ${otp}\nEnter this code to sign in. It expires in 10 minutes.`

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      const { data, error } = await resend.emails.send({
        from: AUTH_FROM,
        to: [to],
        subject: 'Your FweezyTech sign-in code',
        html,
      })
      if (error) {
        console.error('[auth-email] Resend failed (OTP):', error.message)
        // fall through to SMTP below
      } else {
        return { sent: true }
      }
    } catch (err) {
      console.error('[auth-email] Resend threw (OTP):', err instanceof Error ? err.message : String(err))
    }
  }

  const smtp = await sendEmail({
    to,
    subject: 'Your FweezyTech sign-in code',
    html,
    text,
    from: AUTH_FROM,
  })

  if (smtp.sent) return { sent: true }
  return { sent: false, error: smtp.error ?? 'Email delivery is not configured.' }
}