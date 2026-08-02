'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Please enter a valid email')
      setStatus('error')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setStatus('success')
        setMessage('You\'re in! We\'ll notify you when new reviews drop.')
        setEmail('')
      } else {
        const data = await res.json()
        setMessage(data.error || 'Something went wrong')
        setStatus('error')
      }
    } catch {
      setMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,102,255,0.03) 1px, rgba(0,102,255,0.03) 2px)',
            backgroundSize: '100% 2px',
          }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-heading">
            Never miss a Fweezy review.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Join readers getting the latest device reviews, comparisons, and buying guides.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending...' : 'Notify Me'}
            </button>
          </form>

          {message && (
            <p className={`text-sm ${status === 'success' ? 'text-green-500' : 'text-red-400'}`}>
              {message}
            </p>
          )}

          <p className="text-xs text-muted-foreground/60">No spam. Unsubscribe anytime.</p>

          {/* Social links */}
          <div className="flex items-center justify-center gap-6 pt-4">
            {[
              { name: 'YouTube', icon: '▶', href: 'https://youtube.com/@fweezytech', hoverColor: 'hover:text-[#FF0000]' },
              { name: 'TikTok', icon: '♪', href: 'https://tiktok.com/@fweezytech', hoverColor: 'hover:text-foreground' },
              { name: 'Instagram', icon: '◻', href: 'https://instagram.com/fweezytech', hoverColor: 'hover:text-pink-500' },
              { name: 'Facebook', icon: 'f', href: 'https://facebook.com/fweezytech', hoverColor: 'hover:text-[#1877F2]' },
            ].map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-muted-foreground/40 ${s.hoverColor} transition-colors text-xl`}
                aria-label={s.name}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}