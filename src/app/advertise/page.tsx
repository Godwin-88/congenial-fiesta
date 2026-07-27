import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowDown, Check, Download, Users, Eye, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SponsorInquiryForm from '@/components/advertise/SponsorInquiryForm'

export const metadata = {
  title: 'Advertise with FweezyTech | Partner with Kenya\'s Top Tech Creator',
  description: 'Reach Kenya\'s tech-savvy audience. View FweezyTech partnership packages.',
  robots: process.env.ADVERTISE_PAGE_INDEXED === 'true' ? undefined : 'noindex',
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}

export default async function AdvertisePage() {
  const supabase = await getSupabase()

  const [sponsorsResult, packagesResult, mediaKitResult] = await Promise.all([
    supabase.from('sponsors').select('*').eq('active', true).order('display_order', { ascending: true }),
    supabase.from('sponsorship_packages').select('*').order('display_order', { ascending: true }),
    supabase.from('media_kit').select('*').eq('active', true).limit(1).maybeSingle(),
  ])

  const sponsors = sponsorsResult.data ?? []
  const packages = packagesResult.data ?? []
  const mk = mediaKitResult.data ?? null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-[#0066FF]/10 to-transparent">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Partner with <span className="text-[#0066FF]">FweezyTech</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Reach {mk ? String(mk.total_followers ?? '150K+') : '150K+'} tech enthusiasts across Kenya and East Africa.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="#packages">
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-6 text-lg">
              View Packages <ArrowDown className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/api/media-kit/download">
            <Button variant="outline" className="border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/10 px-8 py-6 text-lg">
              <Download className="mr-2 h-5 w-5" /> Download Media Kit
            </Button>
          </Link>
        </div>
      </section>

      {/* ── AUDIENCE OVERVIEW ─────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Who You'll Reach</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Users, label: 'Total Followers', value: mk ? String(mk.total_followers ?? '150K+') : '150K+' },
            { icon: Eye, label: 'Total Views', value: mk ? String(mk.total_views ?? '5M+') : '5M+' },
            { icon: Clock, label: 'Years Creating', value: mk ? String(mk.years_active ?? '5') : '5' },
            { icon: MapPin, label: 'Primary Market', value: 'Kenya + E.A.' },
          ].map((stat, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 text-center">
              <CardContent className="pt-6">
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-[#0066FF]" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { name: 'YouTube', followers: mk ? String(mk.youtube_followers ?? '100K') : '100K', color: 'bg-red-600' },
            { name: 'TikTok', followers: mk ? String(mk.tiktok_followers ?? '35K') : '35K', color: 'bg-gray-800' },
            { name: 'Instagram', followers: mk ? String(mk.instagram_followers ?? '10K') : '10K', color: 'bg-pink-600' },
            { name: 'Facebook', followers: mk ? String(mk.facebook_followers ?? '5K') : '5K', color: 'bg-blue-600' },
          ].map((pf, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${pf.color} flex items-center justify-center text-white font-bold text-xs`}>
                  {pf.name[0]}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{pf.followers}</p>
                  <p className="text-xs text-gray-400">{pf.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-gray-400 text-center max-w-3xl mx-auto">
          FweezyTech's audience is primarily 18–34 year old tech enthusiasts
          in Kenya, Uganda, and Tanzania — active buyers of smartphones and consumer electronics.
        </p>
      </section>

      {/* ── PAST PARTNERS ─────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Brands We've Worked With</h2>
          {sponsors.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {sponsors.map((s: Record<string, unknown>) => {
                const logoUrl = String(s.logo_url ?? '')
                const website = String(s.website ?? '')
                const videoId = String(s.associated_video ?? '')
                const linkUrl = videoId
                  ? `https://youtube.com/watch?v=${videoId}`
                  : website || '#'

                return (
                  <a
                    key={String(s.id)}
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-40 h-20 bg-gray-800 rounded-lg flex items-center justify-center p-4 hover:bg-gray-700 transition-colors"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={String(s.company_name ?? '')}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">{String(s.company_name ?? '')}</span>
                    )}
                  </a>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center">Partnership showcase coming soon</p>
          )}
        </div>
      </section>

      {/* ── SPONSORSHIP PACKAGES ──────────────────────────── */}
      <section id="packages" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Partnership Options</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {packages.length > 0 ? (
            packages.map((p: Record<string, unknown>) => {
              const deliverables = (p.deliverables as string[]) ?? []
              const highlighted = Boolean(p.highlighted)
              const tier = String(p.tier ?? '')
              const tierLabel = tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Premium'

              return (
                <Card
                  key={String(p.id)}
                  className={`bg-gray-900 border-gray-800 relative ${
                    highlighted ? 'ring-2 ring-[#0066FF]' : ''
                  }`}
                >
                  {highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-xs font-bold px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6">
                    <div className="text-[#0066FF] text-sm font-semibold mb-1">{tierLabel}</div>
                    <h3 className="text-xl font-bold mb-3">{String(p.name ?? '')}</h3>
                    <p className="text-gray-400 text-sm mb-6">{String(p.description ?? '')}</p>
                    <ul className="space-y-2 mb-6">
                      {deliverables.map((d: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                    <Link href="#inquiry">
                      <Button className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white">
                        Get Pricing
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <>
              {/* Default packages if none in database */}
              {[
                {
                  tier: 'starter',
                  tierLabel: 'Starter',
                  name: 'Shoutout',
                  description: 'A dedicated mention in one of Fweezy\'s videos reaching his full audience.',
                  deliverables: [
                    '30-second verbal shoutout',
                    'Brand link in video description',
                    'Story mention across Instagram and Facebook',
                  ],
                  highlighted: false,
                },
                {
                  tier: 'pro',
                  tierLabel: 'Pro',
                  name: 'Dedicated Video',
                  description: 'A full video dedicated to your product or service, reviewed by Fweezy.',
                  deliverables: [
                    '5–10 minute dedicated review',
                    'Pinned comment with brand link',
                    'Cross-posted to TikTok and Instagram Reels',
                    'Feature on FweezyTech website device page',
                  ],
                  highlighted: true,
                },
                {
                  tier: 'premium',
                  tierLabel: 'Premium',
                  name: 'Full Campaign',
                  description: 'A complete multi-platform campaign across all FweezyTech channels.',
                  deliverables: [
                    'Dedicated video + 3 short-form clips',
                    'Website feature article',
                    'Email mention to subscriber list',
                    '30-day pinned social post',
                    'Monthly analytics report',
                  ],
                  highlighted: false,
                },
              ].map((pkg, i) => (
                <Card
                  key={i}
                  className={`bg-gray-900 border-gray-800 relative ${
                    pkg.highlighted ? 'ring-2 ring-[#0066FF]' : ''
                  }`}
                >
                  {pkg.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-xs font-bold px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6">
                    <div className="text-[#0066FF] text-sm font-semibold mb-1">{pkg.tierLabel}</div>
                    <h3 className="text-xl font-bold mb-3">{pkg.name}</h3>
                    <p className="text-gray-400 text-sm mb-6">{pkg.description}</p>
                    <ul className="space-y-2 mb-6">
                      {pkg.deliverables.map((d, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                    <Link href="#inquiry">
                      <Button className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white">
                        Get Pricing
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </section>

      {/* ── INQUIRY FORM ──────────────────────────────────── */}
      <section id="inquiry" className="py-16 px-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center">Start a Conversation</h2>
        <p className="text-gray-400 text-center mb-8">
          Fill in the form and we'll get back to you within 3 business days.
        </p>
        <SponsorInquiryForm />
      </section>

      {/* ── MEDIA KIT STRIP ───────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Need Our Stats and Assets for Your Brief?</h2>
          <p className="text-gray-400 mb-6">
            Includes audience stats, bio, brand assets, and contact info.
          </p>
          <Link href="/api/media-kit/download">
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-6 text-lg">
              <Download className="mr-2 h-5 w-5" /> Download Media Kit (PDF)
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}