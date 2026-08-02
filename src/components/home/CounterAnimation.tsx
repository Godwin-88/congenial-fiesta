'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useInView } from 'framer-motion'

type Props = {
  value: number
  suffix?: string
  duration?: number
  className?: string
  decimals?: number
}

export default function CounterAnimation({
  value, suffix = '', duration = 1.5, className, decimals = 0
}: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const displayRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isInView) return
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (displayRef.current) {
          displayRef.current.textContent = v.toFixed(decimals) + suffix
        }
      }
    })
    return () => controls.stop()
  }, [isInView, value, suffix, duration, decimals])

  return (
    <span ref={ref} className={className}>
      <span ref={displayRef}>0{suffix}</span>
    </span>
  )
}