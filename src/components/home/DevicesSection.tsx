'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import SectionHeading from './SectionHeading'
import type { Device } from '@/types/cms'

type Props = {
  devices: Device[]
}

export default function DevicesSection({ devices }: Props) {
  const featured = devices[0]
  const rest = devices.slice(1, 6)

  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="REVIEWS"
          title="Top-Rated Devices"
          tagline="Every score is earned. Every verdict is Fweezy's honest opinion."
          viewAllHref="/devices"
        />

        {devices.length > 0 ? (
          <>
            {/* Featured Device */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-xl border border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/[0.08] p-6 md:p-8 mb-6 hover:border-brand-primary/60 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="relative aspect-video md:aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    {(() => {
                      const image = (featured.images?.[0] as Record<string, string> | undefined)?.url
                      return image ? (
                        <Image src={image} alt={featured.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No image</div>
                      )
                    })()}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-brand-primary font-semibold">{featured.brand?.name}</p>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground font-heading">{featured.name}</h3>
                    </div>
                    {featured.tagline && (
                      <p className="text-muted-foreground italic">&ldquo;{featured.tagline}&rdquo;</p>
                    )}
                    {featured.scores_overall && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-3xl font-bold text-brand-primary font-heading">{featured.scores_overall.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">/10</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Fweezy Score™</span>
                      </div>
                    )}
                    {featured.verdict_pros && featured.verdict_pros.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Pros</p>
                        {featured.verdict_pros.slice(0, 2).map((pro, i) => (
                          <p key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span> {pro}
                          </p>
                        ))}
                      </div>
                    )}
                    <Link href={`/devices/${featured.brand?.slug}/${featured.slug}`}>
                      <span className="inline-flex items-center gap-1 text-brand-primary font-medium text-sm hover:underline">
                        Full Review →
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Compare CTA Strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6"
            >
              <Link href="/compare">
                <div className="rounded-xl border border-dashed border-brand-primary/30 bg-brand-primary/[0.08] px-6 py-4 text-center hover:bg-brand-primary/[0.15] hover:border-brand-primary/60 transition-all cursor-pointer">
                  <p className="text-sm font-medium text-foreground">
                    📊 Compare any two phones side by side →
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Device Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {rest.map((device, i) => {
                  const image = (device.images?.[0] as Record<string, string> | undefined)?.url
                  return (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                    >
                      <Link href={`/devices/${device.brand?.slug}/${device.slug}`}>
                        <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-brand-primary/40 transition-colors h-full">
                          <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                            {image ? (
                              <Image src={image} alt={device.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 50vw, 20vw" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-2 text-center">
                                {device.name}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-muted-foreground">{device.brand?.name}</p>
                            <p className="text-sm font-semibold text-foreground truncate">{device.name}</p>
                            {device.scores_overall && (
                              <span className="inline-block mt-1 rounded bg-brand-primary/10 px-1.5 py-0.5 text-xs font-bold text-brand-primary">
                                {device.scores_overall.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}