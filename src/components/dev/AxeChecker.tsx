'use client'

import { useEffect } from 'react'

export default function AxeChecker() {
  useEffect(() => {
    async function check() {
      try {
        const axe = await import('@axe-core/react')
        const React = await import('react')
        const ReactDOM = await import('react-dom')
        axe.default(React.default, ReactDOM.default, 1000)
      } catch {
        // axe-core/react not available in production — silently skip
      }
    }
    check()
  }, [])

  return null
}