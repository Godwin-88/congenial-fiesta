import { redis } from '@/lib/upstash/redis'
import { v4 as uuidv4 } from 'uuid'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type ChatSession = {
  sessionId: string
  messages: ChatMessage[]
  userId: string | null
  createdAt: number
}

const SESSION_PREFIX = 'chat:session:'
const MAX_MESSAGES = 10
const TTL = parseInt(process.env.CHAT_SESSION_TTL_SECONDS ?? '3600')

export async function getSession(sessionId: string): Promise<ChatSession> {
  const key = `${SESSION_PREFIX}${sessionId}`
  try {
    const raw = await redis.get(key)
    if (raw) {
      await redis.expire(key, TTL)
      return JSON.parse(raw as string) as ChatSession
    }
  } catch {
    // Key not found or parse error — create new
  }
  const session: ChatSession = {
    sessionId,
    messages: [],
    userId: null,
    createdAt: Date.now(),
  }
  await redis.setex(key, TTL, JSON.stringify(session))
  return session
}

export async function appendMessage(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  const session = await getSession(sessionId)
  session.messages.push(message)
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES)
  }
  await redis.setex(key, TTL, JSON.stringify(session))
}

export async function setSessionUser(
  sessionId: string,
  userId: string
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  const session = await getSession(sessionId)
  session.userId = userId
  await redis.setex(key, TTL, JSON.stringify(session))
}

export async function clearSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_PREFIX}${sessionId}`)
}

export function generateSessionId(): string {
  return uuidv4()
}