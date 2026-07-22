import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { getUser } from '@/lib/auth/actions'
import { getSession, appendMessage } from '@/lib/chat/session'
import { retrieveContext, formatContextForPrompt } from '@/lib/chat/retrieval'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'

export const runtime = 'nodejs'
export const maxDuration = 30

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
    devices: [], articles: [], navigationCards: []
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

  // ── 8. Stream from Groq ───────────────────────────────────
  let result
  try {
    result = streamText({
      model: groq(modelToUse),
      system: systemPrompt,
      messages: recentMessages,
      temperature: 0.7,
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