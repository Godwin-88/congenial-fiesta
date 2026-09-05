'use client'

import { useEffect } from 'react'

/**
 * Dev-only resilience helper.
 *
 * Turbopack dev invalidates route chunks whenever the code changes (e.g. a
 * layout edit), which can leave the browser holding references to chunks that
 * no longer exist. Navigation then rejects with a `ChunkLoadError`
 * ("Failed to load chunk …") that surfaces as an unhandled promise rejection.
 *
 * In development we auto-reload the page once on such a rejection instead of
 * leaving the user facing a blank page / console error. The reload is guarded
 * via sessionStorage so a genuinely missing chunk can't loop forever — if the
 * reload itself lands on the same error we stay put and let Next's normal
 * error handling take over.
 */
export default function ChunkLoadReload() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('chunk-load-reload-guard') === '1') return

    const isChunkError = (reason: unknown): boolean => {
      const msg =
        (typeof reason === 'object' && reason !== null && 'message' in reason
          ? String((reason as { message: unknown }).message)
          : '') || String(reason)
      return (
        /Failed to load chunk/i.test(msg) ||
        /Loading chunk/i.test(msg) ||
        /ChunkLoadError/i.test(msg)
      )
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkError(event.reason)) return
      sessionStorage.setItem('chunk-load-reload-guard', '1')
      window.location.reload()
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }, [])

  return null
}