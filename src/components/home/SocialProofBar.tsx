'use client'

import ScrollReveal from './ScrollReveal'
import CounterAnimation from './CounterAnimation'

const stats = [
  { icon: '📺', label: 'YouTube Subscribers', value: 4.02, suffix: 'K', decimals: 2 },
  { icon: '🎵', label: 'TikTok Followers', value: 14.5, suffix: 'K', decimals: 1 },
  { icon: '📸', label: 'Instagram Followers', value: 1272, suffix: '', decimals: 0 },
  { icon: '👁️', label: 'YouTube Views', value: 2, suffix: 'M+', decimals: 0 },
]

export default function SocialProofBar() {
  return (
    <ScrollReveal>
      <section className="border-y border-brand-primary/15 bg-brand-primary/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 md:gap-0 md:justify-between no-scrollbar">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-4 snap-start shrink-0 min-w-[180px] md:min-w-0 md:flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{stat.icon}</span>
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-foreground font-heading">
                      <CounterAnimation value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{stat.label}</p>
                  </div>
                </div>
                {i < stats.length - 1 && (
                  <div className="hidden md:block w-px h-12 bg-brand-primary/15 ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  )
}