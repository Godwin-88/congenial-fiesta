import { createGroq } from '@ai-sdk/groq'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { getUser } from '@/lib/auth/actions'
import { retrieveContext, formatContextForPrompt } from '@/lib/chat/retrieval'
import { buildAdminSystemPrompt } from '@/lib/chat/admin-system-prompt'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Admin AI Chat API
 *
 * Only accessible to authenticated admin/editor users.
 * No rate limiting — admins are trusted.
 * Returns streaming responses with navigation cards and action suggestions.
 */
export async function POST(req: NextRequest) {
  // ── 1. Auth check — only authenticated admin/editor users ──
  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured. GROQ_API_KEY is missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const user = await getUser().catch(() => null)

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Authentication required. Please sign in to use the AI assistant.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── 2. Parse request body ─────────────────────────────────
  let body: {
    messages: Array<{ role: string; content: string }>
    currentCollection?: string
    currentAction?: 'list' | 'create' | 'edit'
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const { messages, currentCollection, currentAction } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }

  const latestMessage = messages[messages.length - 1]
  if (!latestMessage || latestMessage.role !== 'user') {
    return new Response(JSON.stringify({ error: 'Last message must be from user' }), { status: 400 })
  }

  const userQuery = latestMessage.content.trim()
  if (!userQuery || userQuery.length > 2000) {
    return new Response(
      JSON.stringify({ error: 'Message must be 1–2000 characters' }),
      { status: 400 },
    )
  }

  // ── 3. Retrieve relevant context (RAG) ───────────────────
  const context = await retrieveContext(userQuery).catch(() => ({
    devices: [],
    articles: [],
    navigationCards: [],
  }))
  const contextText = formatContextForPrompt(context)
  const systemPrompt = buildAdminSystemPrompt(contextText, currentCollection, currentAction)

  // ── 4. Build message history for LLM ─────────────────────
  const recentMessages = messages.slice(-15).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // ── 5. Stream from Groq ───────────────────────────────────
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! })
  const MODEL = process.env.GROQ_MODEL_PRIMARY ?? 'llama-3.3-70b-versatile'
  const FALLBACK_MODEL = process.env.GROQ_MODEL_FALLBACK ?? 'llama-3.1-8b-instant'

  let result
  try {
    result = streamText({
      model: groq(MODEL),
      system: systemPrompt,
      messages: recentMessages,
      temperature: 0.7,
    })
  } catch (primaryError) {
    console.error('Admin AI primary model failed, trying fallback:', primaryError)
    try {
      result = streamText({
        model: groq(FALLBACK_MODEL),
        system: systemPrompt,
        messages: recentMessages,
        temperature: 0.7,
      })
    } catch (fallbackError) {
      console.error('Admin AI fallback model also failed:', fallbackError)
      return new Response(
        JSON.stringify({
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          retryAfter: 30,
        }),
        { status: 503 },
      )
    }
  }

  // ── 6. Return streaming response with navigation cards ────
  const textResponse = result.toTextStreamResponse()

  const responseHeaders = new Headers(textResponse.headers)
  responseHeaders.set('X-Nav-Cards', JSON.stringify(context.navigationCards))

  return new Response(textResponse.body, {
    status: textResponse.status,
    headers: responseHeaders,
  })
}