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