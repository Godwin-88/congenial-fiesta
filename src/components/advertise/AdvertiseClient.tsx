'use client'

import { useRef, useState } from 'react'
import { ArrowDown, Check, Download, Users, Eye, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SponsorInquiryForm from '@/components/advertise/SponsorInquiryForm'

type Props = {
  defaultPackageInterest?: string
}

export default function AdvertiseClient({ defaultPackageInterest = '' }: Props) {
  const [packageInterest, setPackageInterest] = useState<string>(defaultPackageInterest)
  const contactRef = useRef<HTMLDivElement>(null)

  const scrollToContact = (interest: string) => {
    setPackageInterest(interest)
    contactRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-brand-primary/10 to-transparent">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Partner with <span className="text-brand-primary">Fweezy Tech</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Millan Wafula — Tech Content Creator. Reach tech-savvy audiences across TikTok, Instagram, Facebook, and YouTube.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a href="#packages">
            <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white px-8 py-6 text-lg">
              View Packages <ArrowDown className="ml-2 h-5 w-5" />
            </Button>
          </a>
          <a href="#contact">
            <Button variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary/10 px-8 py-6 text-lg">
              Request a Quote
            </Button>
          </a>
        </div>
      </section>

      {/* ── AUDIENCE OVERVIEW ─────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Who You&apos;ll Reach</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Users, label: 'Total Followers', value: '19.8K+' },
            { icon: Eye, label: 'Total Views', value: '2M+' },
            { icon: Clock, label: 'Years Creating', value: '5' },
            { icon: MapPin, label: 'Primary Market', value: 'Kenya + E.A.' },
          ].map((stat, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-6">
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-brand-primary" />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform breakdown — TikTok primary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { name: 'TikTok', followers: '14.5K', badge: 'Primary Platform' },
            { name: 'Instagram', followers: '1,272' },
            { name: 'Facebook', followers: '5K+' },
            { name: 'YouTube', followers: '4.02K' },
          ].map((pf, i) => (
            <Card key={i} className="relative overflow-visible">
              {pf.badge && (
                <div className="absolute -top-3 right-0 bg-brand-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg z-10">
                  {pf.badge}
                </div>
              )}
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                  {pf.name[0]}
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{pf.followers}</p>
                  <p className="text-xs text-muted-foreground">{pf.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-muted-foreground text-center max-w-3xl mx-auto">
          Fweezy Tech&apos;s audience is primarily 18–34 year old tech enthusiasts
          in Kenya, Uganda, and Tanzania — active buyers of smartphones and consumer electronics.
        </p>
      </section>

      {/* ── STANDARD CAMPAIGN PACKAGES ────────────────────── */}
      <section id="packages" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center">Standard Campaign Packages</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
          One-off campaigns for product launches, brand awareness, or event promotion.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Basic',
              description: '1 short-form vertical video',
              deliverables: [
                '1 high-quality vertical video',
                'Captions and hashtags tailored to each platform',
                'Posted on TikTok, Instagram, Facebook, and YouTube Shorts',
              ],
            },
            {
              name: 'Standard',
              description: '2 short-form vertical videos',
              deliverables: [
                '2 high-quality vertical videos',
                'Captions and hashtags tailored to each platform',
                'Posted on TikTok, Instagram, Facebook, and YouTube Shorts',
              ],
              highlighted: true,
            },
            {
              name: 'Premium',
              description: '3 short-form vertical videos',
              deliverables: [
                '3 high-quality vertical videos',
                'Captions and hashtags tailored to each platform',
                'Posted on TikTok, Instagram, Facebook, and YouTube Shorts',
              ],
            },
          ].map((pkg, i) => (
            <Card
              key={i}
              className={`relative flex flex-col overflow-visible ${
                pkg.highlighted ? 'ring-2 ring-brand-primary' : ''
              }`}
            >
              {pkg.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10">
                  Most Popular
                </div>
              )}
              <CardContent className="pt-10 pb-6 flex flex-col flex-1">
                <div className="text-brand-primary text-sm font-bold tracking-wide mb-1 uppercase">{pkg.name}</div>
                <p className="text-muted-foreground text-sm mb-6">{pkg.description}</p>
                <ul className="space-y-2 mb-6">
                  {pkg.deliverables.map((d, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => scrollToContact(`${pkg.name} Campaign`)}
                  className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white"
                >
                  Request Quote
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── MONTHLY RETAINER PACKAGES ──────────────────────── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-center">Monthly Retainer Packages</h2>
          <p className="text-muted-foreground text-center mb-2 max-w-xl mx-auto">
            Minimum 3-month commitment for ongoing content partnerships.
          </p>
          <p className="text-muted-foreground/60 text-center text-sm mb-8">
            Includes concept development, filming, and editing — optimized for vertical short-form platforms.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter Retainer',
                videos: '2 Videos/Month',
              },
              {
                name: 'Standard Retainer',
                videos: '3 Videos/Month',
                highlighted: true,
              },
              {
                name: 'Premium Retainer',
                videos: '4 Videos/Month',
              },
            ].map((pkg, i) => (
              <Card
                key={i}
                className={`relative flex flex-col overflow-visible ${
                  pkg.highlighted ? 'ring-2 ring-brand-primary' : ''
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10">
                    Best Value
                  </div>
                )}
                <CardContent className="pt-10 pb-6 flex flex-col flex-1">
                  <div className="text-brand-primary text-sm font-bold tracking-wide mb-1 uppercase">{pkg.name}</div>
                  <p className="text-muted-foreground text-sm mb-2">{pkg.videos}</p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Concept development, filming, and editing
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Optimized for vertical short-form platforms
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Content posted on TikTok, Instagram, Facebook, and YouTube Shorts
                    </li>
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Captions and hashtags tailored to each platform
                    </li>
                  </ul>
                  <Button
                    onClick={() => scrollToContact(`${pkg.name}`)}
                    className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white"
                  >
                    Request Quote
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / INQUIRY ─────────────────────────────── */}
      <section id="contact" ref={contactRef} className="py-16 px-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center">Let&apos;s Work Together</h2>
        <p className="text-muted-foreground text-center mb-8">
          Fill out the form below and we&apos;ll get back to you within 3 business days.
        </p>

        <SponsorInquiryForm defaultPackageInterest={packageInterest} />
      </section>

      {/* ── MEDIA KIT STRIP ───────────────────────────────── */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Need Our Stats and Assets for Your Brief?</h2>
          <p className="text-muted-foreground mb-6">
            Includes audience stats, bio, brand assets, and contact info.
          </p>
          <a href="/api/media-kit/download">
            <Button className="bg-brand-primary hover:bg-brand-primary/80 text-white px-8 py-6 text-lg">
              <Download className="mr-2 h-5 w-5" /> Download Media Kit (PDF)
            </Button>
          </a>
        </div>
      </section>
    </div>
  )
}
