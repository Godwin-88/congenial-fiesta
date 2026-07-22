import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PressInquiryForm from './PressInquiryForm'
import CopyButton from './CopyButton'

export const metadata = {
  title: 'Press Room | FweezyTech',
  description: 'Official FweezyTech press resources, brand assets, bios, and media kit.',
}

export default async function PressPage() {
  const mediaKit = await getPayload({ config }).then((payload) =>
    payload.find({
      collection: 'media-kit',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { active: { equals: true } } as any,
      limit: 1,
      depth: 0,
    })
  ).catch(() => ({ docs: [] }))

  const mk = mediaKit.docs[0] as Record<string, unknown> | undefined

  if (!mk) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Press Room</h1>
          <p className="text-gray-400">Press resources coming soon</p>
        </div>
      </div>
    )
  }

  const headshots = (mk.headshots as Array<{ url: string; label?: string }>) ?? []
  const brandColours = (mk.brandColours as Array<Record<string, string>>) ?? []
  const defaultColours: Array<Record<string, string>> = [
    { name: 'Electric Blue', hex: '#0066FF', rgb: '0, 102, 255' },
    { name: 'Amber', hex: '#F59E0B', rgb: '245, 158, 11' },
    { name: 'Charcoal', hex: '#111827', rgb: '17, 24, 39' },
    { name: 'White', hex: '#FFFFFF', rgb: '255, 255, 255' },
  ]
  const colours = brandColours.length > 0 ? brandColours : defaultColours

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-[#0066FF]/10 to-transparent">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">Press Room</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Everything you need to feature FweezyTech.
        </p>
        <Link href="/api/media-kit/download">
          <Button className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-8 py-6 text-lg">
            <Download className="mr-2 h-5 w-5" /> Download Media Kit
          </Button>
        </Link>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        {/* ── OFFICIAL BIO ────────────────────────────────── */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Official Bio</h2>
          <Tabs defaultValue="short" className="w-full">
            <TabsList className="bg-gray-900 border-gray-800">
              <TabsTrigger value="short" className="data-[state=active]:bg-[#0066FF]">Short Bio</TabsTrigger>
              <TabsTrigger value="long" className="data-[state=active]:bg-[#0066FF]">Long Bio</TabsTrigger>
            </TabsList>
            <TabsContent value="short" className="mt-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <p className="text-gray-300 mb-4">{String(mk.shortBio ?? '')}</p>
                  <CopyButton text={String(mk.shortBio ?? '')} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="long" className="mt-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <p className="text-gray-300 mb-4">{String(mk.longBio ?? '')}</p>
                  <CopyButton text={String(mk.longBio ?? '')} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* ── LOGOS ───────────────────────────────────────── */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Logos</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[
              { label: 'Light PNG', url: String(mk.logoLight ?? ''), bg: 'bg-white' },
              { label: 'Dark PNG', url: String(mk.logoDark ?? ''), bg: 'bg-gray-800' },
              { label: 'Light SVG', url: String(mk.logoSvgLight ?? ''), bg: 'bg-white' },
              { label: 'Dark SVG', url: String(mk.logoSvgDark ?? ''), bg: 'bg-gray-800' },
            ].filter((l) => l.url).map((logo, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <div className={`${logo.bg} rounded-lg h-24 flex items-center justify-center mb-3 p-4`}>
                    <img
                      src={logo.url}
                      alt={`FweezyTech ${logo.label}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{logo.label}</span>
                    <a
                      href={logo.url}
                      download
                      className="text-[#0066FF] hover:text-[#0052CC] text-sm"
                    >
                      Download
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Link href="/api/press/logos-zip">
            <Button variant="outline" className="border-[#0066FF] text-[#0066FF] hover:bg-[#0066FF]/10">
              <Download className="mr-2 h-4 w-4" /> Download All Logos (ZIP)
            </Button>
          </Link>
        </section>

        {/* ── HEADSHOTS ──────────────────────────────────── */}
        {headshots.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-6">Approved Headshots</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {headshots.map((hs, i) => (
                <Card key={i} className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-6">
                    <div className="bg-gray-800 rounded-lg h-48 flex items-center justify-center mb-3 overflow-hidden">
                      <img
                        src={hs.url}
                        alt={hs.label ?? `Headshot ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">{hs.label ?? `Headshot ${i + 1}`}</span>
                      <a
                        href={hs.url}
                        download
                        className="text-[#0066FF] hover:text-[#0052CC] text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-gray-500 text-sm mt-4">
              For editorial use only — please credit FweezyTech.
            </p>
          </section>
        )}

        {/* ── BRAND COLOURS ──────────────────────────────── */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Brand Colours</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colours.map((colour, i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="pt-6">
                  <div
                    className="w-full h-16 rounded-lg mb-3"
                    style={{ backgroundColor: colour.hex }}
                  />
                  <p className="font-semibold text-white text-sm">{colour.name}</p>
                  <p className="text-gray-400 text-xs">{colour.hex}</p>
                  {colour.rgb && <p className="text-gray-500 text-xs">RGB({colour.rgb})</p>}
                  {colour.cmyk && <p className="text-gray-500 text-xs">CMYK({colour.cmyk})</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── PRESS INQUIRY FORM ──────────────────────────── */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Press Inquiry</h2>
          <PressInquiryForm />
        </section>
      </div>
    </div>
  )
}