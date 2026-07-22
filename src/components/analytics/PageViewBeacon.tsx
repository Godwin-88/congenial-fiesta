'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const BEACON_TOKEN = process.env.NEXT_PUBLIC_ANALYTICS_BEACON_TOKEN ?? ''

export default function PageViewBeacon() {
  const pathname = usePathname()
  const lastPathRef = useRef<string>('')

  useEffect(() => {
    // Skip initial render — track only navigations
    if (!lastPathRef.current) {
      lastPathRef.current = pathname
      return
    }

    // Skip if path hasn't changed
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    })

    // Use fetch with keepalive to send Authorization header
    fetch('/api/track', {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BEACON_TOKEN}`,
      },
      body: payload,
    }).catch(() => {
      // Silently fail — tracking is non-critical
    })
  }, [pathname])

  return null
}