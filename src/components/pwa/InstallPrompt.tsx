'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Check if user dismissed today
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (dismissed === new Date().toISOString().slice(0, 10)) {
        setShowBanner(false)
      } else {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowBanner(false)
    if (outcome === 'dismissed') {
      localStorage.setItem('pwa-install-dismissed', new Date().toISOString().slice(0, 10))
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString().slice(0, 10))
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-lg backdrop-blur-sm">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-white"
          aria-hidden="true"
        >
          F
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Add FweezyTech to your home screen</p>
          <p className="text-xs text-muted-foreground">Install for the best experience</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="Not now"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}