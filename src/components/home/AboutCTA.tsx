'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

export default function AboutCTA() {
  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden">
          {/* Left Panel */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="bg-card p-8 md:p-12 space-y-6"
          >
            <p className="text-brand-primary text-xs uppercase tracking-widest font-semibold">Meet Fweezy</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground font-heading leading-snug">
              Trusted Voice for honest tech reviews.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              FweezyTech started as a passion project — one person with a camera, a love for tech, and a mission to bring honest, relatable reviews to the Kenyan audience. Today, it's the go-to source for tech buyers across East Africa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/about">
                <button className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/80 transition-colors">
                  About Fweezy →
                </button>
              </Link>
              <Link href="/advertise">
                <button className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Work with Us →
                </button>
              </Link>
            </div>

            {/* Social follow buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { name: 'YouTube', color: 'hover:bg-[#FF0000]', href: 'https://youtube.com/@fweezytech' },
                { name: 'TikTok', color: 'hover:bg-black', href: 'https://tiktok.com/@fweezytech' },
                { name: 'Instagram', color: 'hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600', href: 'https://instagram.com/fweezytech' },
                { name: 'Facebook', color: 'hover:bg-[#1877F2]', href: 'https://facebook.com/fweezytech' },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground ${s.color} hover:text-white transition-all`}
                >
                  {s.name} <span className="opacity-60">Follow</span>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Right Panel — Banner image with overlay */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="relative p-8 md:p-12 flex items-center justify-center min-h-[300px] overflow-hidden"
          >
            {/* Banner background image */}
            <Image
              src="/images/banner.jpg"
              alt="FweezyTech Banner"
              fill
              className="object-cover"
              sizes="50vw"
              priority
            />
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/80 to-brand-primary/40" />
            {/* Diagonal pattern overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)',
              }}
            />

            {/* Floating Badges */}
            {[
              { text: '📺 4.02K Subs', top: '10%', left: '10%', delay: 0 },
              { text: '🎵 14.5K Followers', top: '15%', right: '10%', delay: 0.5 },
              { text: '📸 1,272 Followers', bottom: '15%', left: '10%', delay: 1 },
              { text: '👁️ 2M+ Views', bottom: '10%', right: '10%', delay: 1.5 },
            ].map((badge) => (
              <motion.div
                key={badge.text}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 + badge.delay, type: 'spring', stiffness: 300 }}
                className="absolute float-badge rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg whitespace-nowrap"
                style={{
                  top: badge.top,
                  left: badge.left as string | undefined,
                  right: badge.right as string | undefined,
                  bottom: badge.bottom as string | undefined,
                  animationDelay: `${badge.delay}s`,
                }}
              >
                {badge.text}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}