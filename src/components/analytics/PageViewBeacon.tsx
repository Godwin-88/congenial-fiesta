'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function isTrackablePath(path: string): boolean {
  if (!path || path === '/') return true
  return (
    !path.startsWith('/admin') &&
    !path.startsWith('/preview') &&
    !path.startsWith('/api') &&
    !path.startsWith('/_next')
  )
}

export default function PageViewBeacon() {
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isTrackablePath(pathname)) {
      lastPathRef.current = pathname
      return
    }
    // Fire on the FIRST mount too — direct landings/refreshes are the majority
    // of visits and were previously never recorded (only SPA navigations were).
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      utm_source: params?.get('utm_source'),
      utm_medium: params?.get('utm_medium'),
      utm_campaign: params?.get('utm_campaign'),
    })

    fetch('/api/track', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {
      // Silently fail — tracking is non-critical
    })
  }, [pathname])

  return null
}