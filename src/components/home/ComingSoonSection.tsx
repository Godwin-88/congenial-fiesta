'use client'

import { motion } from 'framer-motion'
import SectionHeading from './SectionHeading'
import type { ComingSoon } from '@/types/cms'

type Props = {
  teasers: ComingSoon[]
}

export default function ComingSoonSection({ teasers }: Props) {
  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="COMING SOON"
          title="What Fweezy's Reviewing Next"
          tagline="Be the first to know when a new review drops."
        />

        {teasers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teasers.map((teaser, i) => (
              <motion.div
                key={teaser.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="aspect-[4/3] bg-muted relative flex items-center justify-center">
                  <div className="text-6xl opacity-20 select-none">📱</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">{teaser.device_name}</h3>
                  {teaser.expected_week && (
                    <p className="text-xs text-muted-foreground">Expected: {teaser.expected_week}</p>
                  )}
                  {teaser.teaser && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{teaser.teaser}</p>
                  )}
                  <button className="w-full rounded-lg border border-brand-primary/30 text-brand-primary px-3 py-2 text-sm font-medium hover:bg-brand-primary/10 transition-colors">
                    🔔 Notify Me
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <p className="text-muted-foreground">Stay tuned — something big is coming.</p>
          </div>
        )}
      </div>
    </section>
  )
}