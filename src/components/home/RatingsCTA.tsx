'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import SectionHeading from './SectionHeading'

const starVariants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.2 + i * 0.1, duration: 0.4, type: 'spring' as const },
  }),
}

const ratings = [
  {
    stars: 5,
    label: 'Excellent',
    desc: 'Top-tier performance & value',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    stars: 4,
    label: 'Great',
    desc: 'Solid all-around devices',
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
    border: 'border-brand-primary/20',
  },
  {
    stars: 3,
    label: 'Good',
    desc: 'Decent for the price',
    color: 'text-brand-accent',
    bg: 'bg-brand-accent/10',
    border: 'border-brand-accent/20',
  },
  {
    stars: 2,
    label: 'Okay',
    desc: 'Has some drawbacks',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    stars: 1,
    label: 'Poor',
    desc: 'Below expectations',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
]

export default function RatingsCTA() {
  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="COMMUNITY"
          title="Rate Devices You've Used"
          tagline="Your honest ratings help fellow Kenyans make better buying decisions."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: Rating scale visualization */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="space-y-3"
          >
            {ratings.map((r, i) => (
              <motion.div
                key={r.label}
                custom={i}
                variants={starVariants}
                className={`flex items-center gap-4 rounded-xl border ${r.border} ${r.bg} p-4 transition-all hover:scale-[1.02]`}
              >
                <div className="flex gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg
                      key={s}
                      className={`h-5 w-5 ${s < r.stars ? r.color : 'text-muted'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: CTA info */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
              <div className="flex gap-4 items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground font-heading">Have you used any of these phones?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share your experience — rate devices on a scale of 1-5 and tell others what you really think.
                    Your rating contributes to the community score visible on every device page.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '⭐', text: 'Simple 1-5 star rating' },
                  { icon: '✍️', text: 'Optional 280-char review' },
                  { icon: '📊', text: 'Community score updates live' },
                  { icon: '🛡️', text: 'Verified owner badges' },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-2 text-sm text-foreground">
                    <span>{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>

              <Link href="/devices">
                <button className="w-full rounded-lg bg-brand-primary px-6 py-3 text-base font-semibold text-white hover:bg-brand-primary/80 transition-colors shadow-lg shadow-brand-primary/20">
                  Browse Devices to Rate →
                </button>
              </Link>

              <p className="text-xs text-center text-muted-foreground">
                Sign in required to submit ratings. Already have an account?{' '}
                <Link href="/auth/login" className="text-brand-primary underline">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Stats card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-xl border border-dashed border-brand-primary/30 bg-brand-primary/[0.05] p-5 text-center"
            >
              <p className="text-sm text-muted-foreground">
                👋 Every rating helps build{' '}
                <span className="font-semibold text-foreground">East Africa&apos;s largest phone review community</span>.
                Your voice matters.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
