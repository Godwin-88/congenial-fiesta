import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { z } from 'zod'
import { NextRequest } from 'next/server'
import { getUser } from '@/lib/auth/actions'
import { getSession, appendMessage } from '@/lib/chat/session'
import { retrieveContext, formatContextForPrompt } from '@/lib/chat/retrieval'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'

const BUDGET_RANGES = [
  'Under $300',
  '$300–$500',
  '$500–$800',
  '$800–$2,000',
  '$2,000–$5,000',
  '$5,000–$10,000',
  '$10,000+',
] as const

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── 1. Check API key ──────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured. GROQ_API_KEY is missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── 2. Rate limiting ──────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'

  const user = await getUser().catch(() => null)
  const isAuthed = !!user

  const guestLimit = parseInt(process.env.CHAT_RATE_LIMIT_GUEST ?? '10')
  const authedLimit = parseInt(process.env.CHAT_RATE_LIMIT_AUTHED ?? '40')

  const { Redis } = await import('@upstash/redis')
  const { Ratelimit } = await import('@upstash/ratelimit')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const chatRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      isAuthed ? authedLimit : guestLimit,
      '1 h'
    ),
    prefix: isAuthed ? 'chat:authed' : 'chat:guest',
  })

  const identifier = isAuthed ? `user:${user!.id}` : `ip:${ip}`
  const { success, limit, remaining } = await chatRatelimit.limit(identifier)

  if (!success) {
    const resetMessage = isAuthed
      ? `You've reached your limit of ${limit} messages per hour. Try again later.`
      : `Guest limit reached (${limit} messages/hour). Sign in for ${process.env.CHAT_RATE_LIMIT_AUTHED ?? 40} messages/hour.`
    return new Response(
      JSON.stringify({ error: resetMessage, rateLimited: true, isGuest: !isAuthed }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // ── 3. Parse request body ─────────────────────────────────
  let body: { messages: Array<{ role: string; content: string }>; sessionId: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const { messages, sessionId } = body

  if (!sessionId || typeof sessionId !== 'string') {
    return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400 })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }

  const latestMessage = messages[messages.length - 1]
  if (!latestMessage || latestMessage.role !== 'user') {
    return new Response(JSON.stringify({ error: 'Last message must be from user' }), { status: 400 })
  }

  const userQuery = latestMessage.content.trim()
  if (!userQuery || userQuery.length > 1000) {
    return new Response(
      JSON.stringify({ error: 'Message must be 1–1000 characters' }),
      { status: 400 }
    )
  }

  // ── 4. Load session ──────────────────────────────────────
  await getSession(sessionId).catch(() => null)

  // ── 5. Retrieve relevant context (RAG) ───────────────────
  const context = await retrieveContext(userQuery).catch(() => ({
    devices: [], articles: [], videos: [], navigationCards: []
  }))
  const contextText = formatContextForPrompt(context)
  const systemPrompt = buildSystemPrompt(contextText)

  // ── 6. Build message history for LLM ─────────────────────
  const recentMessages = messages.slice(-10).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── 7. Check circuit breaker ──────────────────────────────
  const circuitKey = 'groq:circuit:primary'
  const circuitOpen = await redis.get(circuitKey).catch(() => null)

   const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  const PRIMARY_MODEL = process.env.GROQ_MODEL_PRIMARY ?? 'llama-3.3-70b-versatile'
  const FALLBACK_MODEL = process.env.GROQ_MODEL_FALLBACK ?? 'llama-3.1-8b-instant'
  const modelToUse = circuitOpen ? FALLBACK_MODEL : PRIMARY_MODEL

  const protocol = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'localhost:3000'
  const apiBaseUrl = `${protocol}://${host}`

  const tools = {
    submitSponsorInquiry: {
      description:
        'Submit a sponsorship inquiry to FweezyTech on behalf of the user. Use this ONLY when you have collected ALL required information: name, company, email, budgetRange, and message. ' +
        `The budgetRange must be one of: ${BUDGET_RANGES.join(', ')}. ` +
        'Website and packageInterest are optional. On success, the inquiry is saved and an email notification is sent to the FweezyTech team.',
      inputSchema: z.object({
        name: z.string().min(2).max(100).describe('Full name of the person submitting the inquiry'),
        company: z.string().min(2).max(100).describe('Company name'),
        email: z.string().email().describe('Contact email address'),
        budgetRange: z.enum(BUDGET_RANGES).describe('Estimated budget for sponsorship'),
        message: z.string().min(10).max(2000).describe('What the user wants to know about sponsorship or their specific request'),
        website: z.string().url().optional().describe('Company website URL (optional)'),
        packageInterest: z.string().max(200).optional().describe('Specific package or service they are interested in (optional)'),
      }),
      execute: async (params: { name: string; company: string; email: string; budgetRange: string; message: string; website?: string; packageInterest?: string }) => {
        const res = await fetch(`${apiBaseUrl}/api/sponsor-inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        })
        if (!res.ok) {
          const errorText = await res.text()
          return `Failed to submit: ${errorText}`
        }
        return 'Sponsorship inquiry submitted successfully! The FweezyTech team will contact you at the email you provided within 1-2 business days.'
      },
    },
  }

  // ── 8. Stream from Groq ───────────────────────────────────
  let result
  try {
    result = streamText({
      model: groq(modelToUse),
      system: systemPrompt,
      messages: recentMessages,
      temperature: 0.7,
      tools,
      onFinish: async ({ text }) => {
        await appendMessage(sessionId, {
          role: 'user',
          content: userQuery,
          timestamp: Date.now(),
        }).catch(() => {})

        await appendMessage(sessionId, {
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
        }).catch(() => {})
      },
    })
  } catch (primaryError) {
    console.error('Primary model failed, trying fallback:', primaryError)
    await redis.setex(circuitKey, 60, '1').catch(() => {})
    try {
      result = streamText({
        model: groq(FALLBACK_MODEL),
        system: systemPrompt,
        messages: recentMessages,
        temperature: 0.7,
        tools,
      })
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError)
      return new Response(
        JSON.stringify({
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          retryAfter: 30,
        }),
        { status: 503 }
      )
    }
  }

  // ── 9. Return streaming response with navigation cards ────
  const textResponse = result.toTextStreamResponse()

  const responseHeaders = new Headers(textResponse.headers)
  responseHeaders.set('X-Nav-Cards', JSON.stringify(context.navigationCards))
  responseHeaders.set('X-Rate-Limit-Remaining', String(remaining))
  responseHeaders.set('X-Is-Guest', String(!isAuthed))

  return new Response(textResponse.body, {
    status: textResponse.status,
    headers: responseHeaders,
  })
}