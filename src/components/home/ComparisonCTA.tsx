'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Device } from '@/types/cms'

type Props = {
  devices: Device[]
}

export default function ComparisonCTA({ devices }: Props) {
  const chips = [
    { label: 'S25 Ultra vs iPhone 16 Pro', href: '/compare' },
    { label: 'Pixel 9 vs S24', href: '/compare' },
    { label: 'Tecno vs Infinix', href: '/compare' },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-brand-primary/10 border border-brand-primary/20 p-8 md:p-12 text-center"
        >
          {/* Phone SVGs */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.svg
              variants={{ hidden: { x: -60, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.5 } } }}
              width="40" height="64" viewBox="0 0 40 64" fill="none" className="text-muted-foreground"
            >
              <rect x="2" y="2" width="36" height="60" rx="6" stroke="currentColor" strokeWidth="2" />
              <rect x="10" y="8" width="20" height="36" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="20" cy="52" r="3" stroke="currentColor" strokeWidth="1.5" />
            </motion.svg>
            <motion.span
              variants={{ hidden: { opacity: 0, scale: 0 }, visible: { opacity: 1, scale: 1, transition: { delay: 0.3, duration: 0.3 } } }}
              className="text-2xl font-bold text-brand-primary font-heading"
            >VS</motion.span>
            <motion.svg
              variants={{ hidden: { x: 60, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.5, delay: 0.1 } } }}
              width="44" height="72" viewBox="0 0 44 72" fill="none" className="text-foreground"
            >
              <rect x="2" y="2" width="40" height="68" rx="8" stroke="currentColor" strokeWidth="2" />
              <rect x="12" y="10" width="20" height="40" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="22" cy="58" r="3" stroke="currentColor" strokeWidth="1.5" />
            </motion.svg>
            <motion.svg
              variants={{ hidden: { x: 60, opacity: 0 }, visible: { x: 0, opacity: 1, transition: { duration: 0.5, delay: 0.2 } } }}
              width="40" height="64" viewBox="0 0 40 64" fill="none" className="text-muted-foreground"
            >
              <rect x="2" y="2" width="36" height="60" rx="6" stroke="currentColor" strokeWidth="2" />
              <rect x="10" y="8" width="20" height="36" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="20" cy="52" r="3" stroke="currentColor" strokeWidth="1.5" />
            </motion.svg>
          </motion.div>

          <h2 className="text-2xl md:text-3xl font-bold text-foreground font-heading mb-3">
            Can't decide? Let Fweezy's data decide for you.
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Compare specs, Fweezy Scores, benchmarks, and buy prices side by side. Up to 3 devices at once.
          </p>

          <Link href="/compare">
            <button className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-8 py-3 text-base font-semibold text-white hover:bg-brand-primary/80 transition-colors shadow-lg shadow-brand-primary/20">
              Open Comparison Tool →
            </button>
          </Link>

          {/* Comparison Chips */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mt-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {chips.map((chip, i) => (
              <motion.div
                key={chip.label}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { delay: 0.5 + i * 0.1 } } }}
              >
                <Link href={chip.href}>
                  <span className="inline-block rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    {chip.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}