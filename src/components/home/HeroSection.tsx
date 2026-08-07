'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import type { Device } from '@/types/cms'

const ParticleField = dynamic(() => import('@/components/home/ParticleField'), { ssr: false })

type Props = {
  topDevices: Device[]
}

const ROTATING_WORDS = ['Unboxing', 'Unpacking', 'Reviewing', 'Testing', 'Comparing', 'Exploring'] as const
const WORD_DURATION = 2

function RotatingWord() {
  const [index, setIndex] = useState(0)
  const word = ROTATING_WORDS[index]

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
    }, WORD_DURATION * 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.span
      key={word}
      className="text-brand-primary draw-underline inline-block"
      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {word}.
    </motion.span>
  )
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.2 } }
}

const itemFadeDown = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const itemFadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

export default function HeroSection({ topDevices }: Props) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background glows */}
      <div className="hero-glow-blue glow-pulse absolute bottom-0 left-0 w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full pointer-events-none" />
      <div className="hero-glow-amber glow-pulse absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Particle field */}
      <ParticleField />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column */}
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Headline */}
            <motion.div variants={itemFadeDown} className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground font-heading leading-tight">
                Tech. <RotatingWord />
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground font-heading leading-tight">
                Reviews.
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.div variants={itemFadeDown}>
              <p className="text-lg text-muted-foreground max-w-lg">
                From flagship phones to budget picks — Fweezy tells you exactly what to buy.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={itemFadeUp} className="flex flex-wrap gap-4 pt-2">
              <Link href="/devices">
                <button className="group relative inline-flex items-center gap-2 rounded-lg bg-brand-primary px-6 py-3 text-base font-semibold text-white transition-all duration-200 active:translate-y-0.5 active:shadow-none hover:shadow-lg hover:shadow-brand-primary/30">
                  Explore Devices
                </button>
              </Link>
              <Link href="/videos">
                <button className="group inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-base font-semibold text-foreground transition-all duration-200 hover:bg-white hover:text-background">
                  Watch Reviews
                </button>
              </Link>
            </motion.div>

            {/* Social proof pills */}
            <motion.div variants={itemFadeUp} className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: '📺', name: 'YouTube', count: '4.02K' },
                { icon: '🎵', name: 'TikTok', count: '14.5K' },
                { icon: '📸', name: 'Instagram', count: '1,272' },
                { icon: '👁️', name: 'YouTube Views', count: '2M+' },
              ].map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <span>{s.icon}</span>
                  <span>{s.count}</span>
                  <span className="text-muted-foreground/60">{s.name}</span>
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column — 3D Device Stack (desktop only) */}
          <motion.div
            className="hidden lg:flex flex-col items-center justify-center relative"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.4 } }}
          >
            <div
              className="relative"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              {topDevices.length > 0 ? (
                <>
                  {topDevices.slice(0, 3).map((device, i) => {
                    const image = (device.images?.[0] as Record<string, string> | undefined)?.url
                    const rotation = -6 + i * 6
                    const translateY = i * -8
                    const zIndex = 10 - i

                    return (
                      <motion.div
                        key={device.id}
                        className="absolute top-0 left-0 w-72 rounded-2xl overflow-hidden border border-border bg-card shadow-xl transition-shadow duration-300"
                        style={{
                          zIndex,
                          transform: `rotateZ(${rotation}deg) translateY(${translateY}px)`,
                        }}
                        whileHover={i === 0 ? { y: -20, scale: 1.02, boxShadow: '0 20px 60px rgba(0,102,255,0.3)' } : {}}
                      >
                        {image ? (
                          <div className="aspect-[3/4] relative">
                            <Image
                              src={image}
                              alt={device.name}
                              fill
                              className="object-cover"
                              sizes="288px"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-white font-bold text-sm">{device.brand?.name} {device.name}</p>
                              {device.scores_overall && (
                                <span className="inline-block mt-1 rounded bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                                  {device.scores_overall}/10
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[3/4] bg-muted flex items-center justify-center p-4">
                            <p className="text-muted-foreground text-center text-sm">
                              {device.brand?.name} <br /> {device.name}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </>
              ) : (
                /* Animated 3D phone mockup when no device data */
                <motion.div
                  className="relative w-72"
                  initial={{ opacity: 0, rotateY: -15 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Phone body */}
                  <motion.div
                    className="relative w-72 h-[500px] rounded-[2.5rem] border-4 border-foreground/20 bg-gradient-to-b from-card to-muted shadow-2xl overflow-hidden"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* Screen */}
                    <div className="absolute inset-2 rounded-[2rem] bg-gradient-to-br from-brand-primary/5 via-background to-brand-primary/10 overflow-hidden">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground/20 rounded-b-xl z-10" />
                      {/* Screen content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                        <motion.div
                          className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center mb-4"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="text-2xl">📱</span>
                        </motion.div>
                        <p className="text-foreground/60 text-xs text-center font-medium">FweezyTech</p>
                        <div className="mt-4 space-y-2 w-full">
                          <div className="h-2 bg-brand-primary/20 rounded-full w-3/4 mx-auto" />
                          <div className="h-2 bg-brand-primary/10 rounded-full w-1/2 mx-auto" />
                        </div>
                      </div>
                    </div>
                    {/* Side buttons */}
                    <div className="absolute right-[-4px] top-24 w-1 h-8 bg-foreground/20 rounded-r" />
                    <div className="absolute right-[-4px] top-36 w-1 h-12 bg-foreground/20 rounded-r" />
                    <div className="absolute left-[-4px] top-32 w-1 h-10 bg-foreground/20 rounded-l" />
                  </motion.div>

                  {/* Floating glow behind phone */}
                  <motion.div
                    className="absolute -inset-10 rounded-full bg-brand-primary/10 blur-3xl -z-10"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              )}
            </div>

            {/* Floating Logo Badge */}
            <motion.div
              className="absolute -top-6 -right-6 z-20"
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.8, type: 'spring', stiffness: 200 }}
            >
              <motion.div
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-primary/30 shadow-xl shadow-brand-primary/20 bg-card"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/images/logo.jpeg"
                  alt="FweezyTech"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </motion.div>
            </motion.div>

            {/* Floating Score Badge */}
            {topDevices[0]?.scores_overall && (
              <motion.div
                className="mt-80 flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 1, duration: 0.5 } }}
              >
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none" stroke="#0066FF" strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 28}
                      initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - (topDevices[0].scores_overall ?? 8) / 10) }}
                      transition={{ duration: 1.5, delay: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                    {topDevices[0].scores_overall?.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Fweezy Score™</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 2 } }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-xs text-muted-foreground/60">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground/60">
            <path d="M8 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}