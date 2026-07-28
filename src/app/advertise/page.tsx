import Link from 'next/link'
import { ArrowDown, Check, Download, Users, Eye, Clock, MapPin, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SponsorInquiryForm from '@/components/advertise/SponsorInquiryForm'

export const metadata = {
  title: 'Advertise with Fweezy Tech | Tech Content Creator Rate Card',
  description: 'Partner with Millan Wafula (Fweezy Tech) — Kenya\'s top tech content creator. View campaign packages, monthly retainer options, and contact info.',
  robots: process.env.ADVERTISE_PAGE_INDEXED === 'true' ? undefined : 'noindex',
}

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-[#0066FF]/10 to-transparent">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Partner with <span className="text-[#0066FF]">Fweezy Tech</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Millan Wafula — Tech Content Creator. Reach tech-savvy audiences across TikTok, Instagram, Facebook, and YouTube.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="#packages">
            <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-6 text-lg">
              View Rate Card <ArrowDown className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="#contact">
            <Button variant="outline" className="border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/10 px-8 py-6 text-lg">
              Get in Touch
            </Button>
          </Link>
        </div>
      </section>

      {/* ── AUDIENCE OVERVIEW ─────────────────────────────── */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Who You'll Reach</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Users, label: 'Total Followers', value: '150K+' },
            { icon: Eye, label: 'Total Views', value: '5M+' },
            { icon: Clock, label: 'Years Creating', value: '5' },
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

        {/* Platform breakdown — TikTok primary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { name: 'TikTok', followers: '35K+', color: 'bg-gray-800', badge: 'Primary Platform' },
            { name: 'Instagram', followers: '10K+', color: 'bg-pink-600' },
            { name: 'Facebook', followers: '5K+', color: 'bg-blue-600' },
            { name: 'YouTube', followers: '100K+', color: 'bg-red-600' },
          ].map((pf, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 relative overflow-visible">
              {pf.badge && (
                <div className="absolute -top-3 right-0 bg-[#0066FF] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg z-10">
                  {pf.badge}
                </div>
              )}
              <CardContent className="pt-6 flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${pf.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {pf.name[0]}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{pf.followers}</p>
                  <p className="text-xs text-gray-400">{pf.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-gray-400 text-center max-w-3xl mx-auto">
          Fweezy Tech's audience is primarily 18–34 year old tech enthusiasts
          in Kenya, Uganda, and Tanzania — active buyers of smartphones and consumer electronics.
        </p>
      </section>

      {/* ── STANDARD CAMPAIGN RATES ────────────────────────── */}
      <section id="packages" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center">Standard Campaign Rates</h2>
        <p className="text-gray-400 text-center mb-8 max-w-xl mx-auto">
          One-off campaigns for product launches, brand awareness, or event promotion.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Basic',
              price: '$250',
              description: '1 short-form vertical video',
              deliverables: [
                '1 high-quality vertical video',
                'Captions and hashtags tailored to each platform',
                'Posted on TikTok, Instagram, Facebook, and YouTube Shorts',
              ],
              highlighted: false,
            },
            {
              name: 'Standard',
              price: '$450',
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
              price: '$700',
              description: '3 short-form vertical videos',
              deliverables: [
                '3 high-quality vertical videos',
                'Captions and hashtags tailored to each platform',
                'Posted on TikTok, Instagram, Facebook, and YouTube Shorts',
              ],
              highlighted: false,
            },
          ].map((pkg, i) => (
            <Card
              key={i}
              className={`bg-gray-900 border-gray-800 relative flex flex-col overflow-visible ${
                pkg.highlighted ? 'ring-2 ring-[#0066FF]' : ''
              }`}
            >
              {pkg.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10">
                  Most Popular
                </div>
              )}
              <CardContent className="pt-10 pb-6 flex flex-col flex-1">
                <div className="text-[#0066FF] text-sm font-bold tracking-wide mb-1 uppercase">{pkg.name}</div>
                <div className="text-3xl font-bold mb-1">{pkg.price}</div>
                <p className="text-gray-400 text-sm mb-6">{pkg.description}</p>
                <ul className="space-y-2 mb-6">
                  {pkg.deliverables.map((d, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link href="#contact">
                  <Button className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white">
                    Book Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── MONTHLY RETAINER PACKAGES ──────────────────────── */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-2 text-center">Monthly Retainer Packages</h2>
          <p className="text-gray-400 text-center mb-2 max-w-xl mx-auto">
            Minimum 3-month commitment for ongoing content partnerships.
          </p>
          <p className="text-gray-500 text-center text-sm mb-8">
            Includes concept development, filming, and editing — optimized for vertical short-form platforms.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter Retainer',
                videos: '2 Videos/Month',
                price: '$400/mo',
                total: '$1,200',
              },
              {
                name: 'Standard Retainer',
                videos: '3 Videos/Month',
                price: '$600/mo',
                total: '$1,800',
                highlighted: true,
              },
              {
                name: 'Premium Retainer',
                videos: '4 Videos/Month',
                price: '$750/mo',
                total: '$2,250',
              },
            ].map((pkg, i) => (
              <Card
                key={i}
                className={`bg-gray-900 border-gray-800 relative flex flex-col overflow-visible ${
                  pkg.highlighted ? 'ring-2 ring-[#0066FF]' : ''
                }`}
              >
                {pkg.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap z-10">
                    Most Popular
                  </div>
                )}
                <CardContent className="pt-10 pb-6 flex flex-col flex-1">
                  <div className="text-[#0066FF] text-sm font-bold tracking-wide mb-1 uppercase">{pkg.name}</div>
                  <div className="text-3xl font-bold mb-1">{pkg.price}</div>
                  <p className="text-gray-400 text-sm mb-2">{pkg.videos}</p>
                  <p className="text-gray-500 text-xs mb-6">Total 3-Month Value: {pkg.total}</p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Concept development, filming, and editing
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Optimized for vertical short-form platforms
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Content posted on TikTok, Instagram, Facebook, and YouTube Shorts
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Captions and hashtags tailored to each platform
                    </li>
                  </ul>
                  <Link href="#contact">
                    <Button className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white">
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Terms */}
          <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-3 text-center">Payment Terms</h3>
            <p className="text-gray-400 text-sm text-center">
              A 50/50 split of the total contract value. 50% is due upfront upon signing to secure exclusivity, and the final 50% is due within 15 days after the last deliverable is published.
            </p>
          </div>
        </div>
      </section>

      {/* ── CONTACT ────────────────────────────────────────── */}
      <section id="contact" className="py-16 px-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center">Let's Work Together</h2>
        <p className="text-gray-400 text-center mb-8">
          Ready to partner? Reach out directly or fill in the form below.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="mailto:business@fweezytech.com"
            className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-6 py-4 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Mail className="h-5 w-5 text-[#0066FF]" />
            <span>business@fweezytech.com</span>
          </a>
          <a
            href="tel:+254793789954"
            className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-6 py-4 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <Phone className="h-5 w-5 text-[#0066FF]" />
            <span>0793 789 954 (Call/WhatsApp)</span>
          </a>
        </div>

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