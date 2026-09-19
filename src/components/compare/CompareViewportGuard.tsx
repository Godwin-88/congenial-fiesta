'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clampCompareSlugs } from '@/lib/devices/compare-viewport'

interface CompareViewportGuardProps {
  /** Slugs currently in the comparison, in URL order. */
  slugs: string[]
}

/**
 * Enforces the viewport device cap by rewriting the URL when a phone in
 * portrait is asked to compare more devices than the layout can render.
 *
 * Uses `replace` so a resize/orientation change never grows browser history,
 * and bails out when nothing needs trimming (the common case) to avoid a
 * needless server round-trip.
 */
export default function CompareViewportGuard({ slugs }: CompareViewportGuardProps) {
  const router = useRouter()

  useEffect(() => {
    function enforce() {
      const clamped = clampCompareSlugs(slugs, window.innerWidth, window.innerHeight)
      if (clamped === slugs) return
      if (clamped.length < 2) {
        router.replace('/devices?toast=compare-error')
        return
      }
      router.replace(`/compare?devices=${clamped.join(',')}`)
    }

    enforce()
    window.addEventListener('resize', enforce)
    window.addEventListener('orientationchange', enforce)
    return () => {
      window.removeEventListener('resize', enforce)
      window.removeEventListener('orientationchange', enforce)
    }
  }, [slugs, router])

  return null
}