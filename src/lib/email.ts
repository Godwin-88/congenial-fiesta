import nodemailer, { type Transporter } from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '465', 10)
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const DEFAULT_FROM =
  process.env.MAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? 'business@fweezytech.com'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  sent: boolean
  skipped?: boolean
  messageId?: string
  error?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS)
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const t = getTransporter()
  if (!t) {
    console.warn('[email] SMTP is not configured (set SMTP_USER / SMTP_PASS). Skipping send.')
    return { sent: false, skipped: true }
  }
  try {
    const info = await t.sendMail({
      from: opts.from ?? DEFAULT_FROM,
      to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Failed to send email:', message)
    return { sent: false, error: message }
  }
}
