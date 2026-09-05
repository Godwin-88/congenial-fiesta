'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, X, Send, Trash2, Sparkles } from 'lucide-react'
import type { NavigationCard } from '@/types/chat'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type CollectionContext = {
  slug?: string
  action?: 'list' | 'create' | 'edit'
  label?: string
}

const ROUTE_MAPS: { pattern: RegExp; slug: string; action: CollectionContext['action']; label: string }[] = [
  { pattern: /^\/admin\/devices\/[\w-]+\/edit/, slug: 'devices', action: 'edit', label: 'Edit Device' },
  { pattern: /^\/admin\/devices\/create/, slug: 'devices', action: 'create', label: 'New Device' },
  { pattern: /^\/admin\/devices/, slug: 'devices', action: 'list', label: 'Devices' },
  { pattern: /^\/admin\/articles\/[\w-]+\/edit/, slug: 'articles', action: 'edit', label: 'Edit Article' },
  { pattern: /^\/admin\/articles\/create/, slug: 'articles', action: 'create', label: 'New Article' },
  { pattern: /^\/admin\/articles/, slug: 'articles', action: 'list', label: 'Articles' },
  { pattern: /^\/admin\/brands/, slug: 'brands', action: 'list', label: 'Brands' },
  { pattern: /^\/admin\/videos/, slug: 'videos', action: 'list', label: 'Videos' },
  { pattern: /^\/admin\/coming-soon/, slug: 'coming-soon', action: 'list', label: 'Coming Soon' },
  { pattern: /^\/admin\/media\//, slug: 'media', action: 'list', label: 'Media Library' },
  { pattern: /^\/admin\/media$/, slug: 'media', action: 'list', label: 'Media Library' },
  { pattern: /^\/admin\/sponsors/, slug: 'sponsors', action: 'list', label: 'Sponsors' },
  { pattern: /^\/admin\/packages/, slug: 'packages', action: 'list', label: 'Packages' },
  { pattern: /^\/admin\/milestones/, slug: 'milestones', action: 'list', label: 'Milestones' },
  { pattern: /^\/admin\/awards/, slug: 'awards', action: 'list', label: 'Awards' },
  { pattern: /^\/admin\/media-kit/, slug: 'media-kit', action: 'list', label: 'Media Kit' },
  { pattern: /^\/admin\/users/, slug: 'users', action: 'list', label: 'Users' },
  { pattern: /^\/admin\/settings/, slug: 'settings', action: 'list', label: 'Settings' },
  { pattern: /^\/admin\/analytics/, slug: 'analytics', action: 'list', label: 'Analytics' },
]

function getCollectionFromPath(path: string): CollectionContext {
  const match = ROUTE_MAPS.find((r) => r.pattern.test(path))
  if (match) return { slug: match.slug, action: match.action, label: match.label }
  if (path === '/' || /^\/admin\/?$/.test(path)) return { label: 'Dashboard' }
  if (path.startsWith('/admin')) {
    const seg = path.split('/').filter(Boolean)[1]
    if (seg) {
      return {
        slug: seg,
        action: 'list',
        label: seg.charAt(0).toUpperCase() + seg.slice(1),
      }
    }
  }
  return {}
}

const SUGGESTIONS: Record<string, string[]> = {
  devices: [
    'Which devices are still drafts?',
    'Which devices are missing images?',
    'How do I publish a device?',
    'Draft a tagline for the newest device',
  ],
  articles: [
    'Which articles are drafts?',
    'Help me write an SEO description',
    'What categories can an article have?',
  ],
  brands: ['How do I add a brand?', 'Which brands are featured?'],
  videos: ['How do I attach a video to a device?', 'Which videos are featured?'],
  media: ['Where are my device images stored?', 'How do I upload to a specific bucket?'],
  'coming-soon': ['How do I create a coming-soon device?'],
}

function suggestionsFor(ctx: CollectionContext): string[] {
  const list = ctx.slug ? SUGGESTIONS[ctx.slug] : undefined
  return list ?? [
    'Which devices are still drafts?',
    'How do I publish a new device?',
    'Help me write an SEO description',
    'How is the Fweezy Score calculated?',
  ]
}

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [navigationCards, setNavigationCards] = useState<Record<string, NavigationCard[]>>({})
  const pathname = usePathname() ?? ''
  const context = useMemo(() => getCollectionFromPath(pathname), [pathname])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage = input.trim()
      setInput('')
      setError(null)
      setIsLoading(true)

      const userMsgId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userMessage }])

      const collection = getCollectionFromPath(pathname)

      try {
        const response = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: userMessage }],
            currentCollection: collection.slug,
            currentAction: collection.action,
          }),
        })

        const cardsHeader = response.headers.get('X-Nav-Cards')
        if (cardsHeader) {
          try {
            const cards: NavigationCard[] = JSON.parse(cardsHeader)
            setNavigationCards((prev) => ({ ...prev, __pending__: cards }))
          } catch {
            // ignore header parse errors
          }
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || `Request failed (${response.status})`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let assistantContent = ''
        const assistantId = crypto.randomUUID()

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('0:')) {
              const text = line.slice(2)
              assistantContent += text
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)),
              )
            }
          }
        }

        setNavigationCards((prev) => {
          const cards = prev['__pending__']
          if (!cards) return prev
          const { __pending__, ...rest } = prev
          return { ...rest, [assistantId]: cards }
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        setError(msg)
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, messages, pathname],
  )
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const clearChat = () => {
    setMessages([])
    setNavigationCards({})
    setError(null)
  }

  const suggestions = suggestionsFor(context)

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        className={`fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all duration-200 hover:scale-105 ${
          isOpen ? 'bg-muted-foreground/80' : 'bg-brand-primary'
        }`}
      >
        {isOpen ? <X size={22} /> : <Bot size={26} />}
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-24 right-6 z-[59] flex max-h-[calc(100vh-7rem)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-200 ${
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-brand-primary px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white">
              <Bot size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Fweezy Assistant</div>
              <div className="text-[11px] text-white/75">
                {context.label ? (
                  <>
                    Viewing: {context.label}
                    {context.action ? ` · ${context.action}` : ''}
                  </>
                ) : (
                  'CMS Co-pilot'
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearChat}
            title="Clear chat"
            className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Trash2 size={16} />
          </button>
        </div>
{/* Messages */}
        <div className="flex min-h-[220px] max-h-[420px] flex-1 flex-col gap-2 overflow-y-auto p-3">
          {messages.length === 0 && !isLoading && (
            <div className="px-1">
              <div className="mb-3 text-sm leading-relaxed text-muted-foreground">
                Hi! I'm your CMS co-pilot. I can help you manage content, generate drafts, and
                navigate the admin panel. What would you like to do?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand-primary hover:text-foreground"
                  >
                    <Sparkles size={12} className="text-brand-primary" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="flex flex-col">
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'self-end rounded-br-sm bg-brand-primary text-white'
                    : 'self-start rounded-bl-sm bg-muted text-foreground'
                }`}
              >
                {m.content ||
                  (m.role === 'assistant' && isLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </span>
                  ) : (
                    ''
                  ))}
              </div>

              {navigationCards[m.id]?.length ? (
                <div className="mt-1.5 space-y-1.5">
                  {navigationCards[m.id]!.map((c) => (
                    <a
                      key={c.url}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border bg-background/60 p-2 transition-colors hover:border-brand-primary"
                    >
                      <div className="text-xs font-medium text-foreground">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">{c.subtitle}</div>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about the CMS…"
              rows={1}
              className="max-h-20 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-[38px] items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
