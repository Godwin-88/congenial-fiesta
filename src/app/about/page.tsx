import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import JsonLd from '@/components/seo/JsonLd'
import { personJsonLd, organizationJsonLd } from '@/lib/seo/jsonld'
import TimelineClient from './TimelineClient'

const HIGHLIGHT_REEL_VIDEO_ID = 'dQw4w9WgXcQ' // placeholder — replace with real ID

export const metadata = {
  title: 'About Fweezy | FweezyTech',
  description:
    "Meet Fweezy — Kenya's top tech content creator covering smartphones, reviews, and comparisons on YouTube, TikTok, Instagram, and Facebook.",
  openGraph: {
    images: [{ url: '/api/og/default?title=About+Fweezy', width: 1200, height: 630 }],
  },
}

export default async function AboutPage() {
  const payload = await getPayload({ config })

  const [milestones, awards, mediaKitResult] = await Promise.all([
    payload.find({ collection: 'milestones', sort: '-year,displayOrder', limit: 50 }).catch(() => ({ docs: [] })),
    payload.find({ collection: 'awards', sort: '-year,displayOrder', limit: 20 }).catch(() => ({ docs: [] })),
    payload.find({ collection: 'media-kit', where: { active: { equals: true } }, limit: 1 }).catch(() => ({ docs: [] })),
  ])

  const mediaKit = mediaKitResult.docs[0] || null

  // Group milestones by year
  const milestonesByYear: Record<number, Array<{ id: string; year: number; title: string; description?: string | null; displayOrder?: number | null }>> = {}
  for (const m of milestones.docs) {
    const year = Number(m.year)
    if (!milestonesByYear[year]) milestonesByYear[year] = []
    milestonesByYear[year].push({
      id: m.id,
      year,
      title: String(m.title ?? ''),
      description: m.description !== undefined && m.description !== null ? String(m.description) : null,
      displayOrder: m.displayOrder !== undefined && m.displayOrder !== null ? Number(m.displayOrder) : null,
    } as { id: string; year: number; title: string; description: string | null; displayOrder: number | null })
  }
  const sortedYears = Object.keys(milestonesByYear).map(Number).sort((a, b) => b - a)

  return (
    <>
      <JsonLd data={[personJsonLd(), organizationJsonLd()]} />

      <div className="flex flex-col">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
              {/* Photo placeholder */}
              <div className="order-2 lg:order-1">
                <div className="mx-auto h-80 w-80 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 sm:h-96 sm:w-96">
                  <div className="flex h-full items-center justify-center">
                    <span className="text-6xl font-bold text-brand-primary/30">Fweezy</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="order-1 lg:order-2">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Meet Fweezy
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-foreground/70">
                  {mediaKit?.shortBio ||
                    "Kenya's leading tech content creator, bringing you honest, in-depth reviews of the latest smartphones and gadgets. From unboxings to real-world performance tests, Fweezy helps you make informed buying decisions."}
                </p>

                {/* Social stat pills */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {mediaKit?.totalFollowers && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {mediaKit.totalFollowers} Followers
                    </div>
                  )}
                  {mediaKit?.totalViews && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {mediaKit.totalViews} Views
                    </div>
                  )}
                  {mediaKit?.yearsActive && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {mediaKit.yearsActive} Years Active
                    </div>
                  )}
                </div>

                {/* Social follow buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="https://www.youtube.com/@fweezytech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    aria-label="Follow on YouTube"
                  >
                    YouTube
                  </a>
                  <a
                    href="https://www.tiktok.com/@fweezytech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                    aria-label="Follow on TikTok"
                  >
                    TikTok
                  </a>
                  <a
                    href="https://www.instagram.com/fweezytech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-700"
                    aria-label="Follow on Instagram"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.facebook.com/fweezytech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    aria-label="Follow on Facebook"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ORIGIN STORY */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">The Story</h2>
          <div className="mt-4 border-l-4 border-brand-primary pl-6">
            <p className="text-lg leading-relaxed text-foreground/70">
              {mediaKit?.longBio ||
                "FweezyTech started as a passion project — one person with a camera, a love for tech, and a mission to bring honest, relatable reviews to the Kenyan audience. What began as YouTube videos in a small home studio has grown into a multi-platform brand reaching hundreds of thousands of viewers every month. Every review is hands-on, every opinion is independent, and every recommendation is backed by real-world testing."}
            </p>
          </div>
        </section>

        {/* SOCIAL PROOF BAR */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {[
                { name: 'YouTube', count: mediaKit?.youtubeFollowers || '—', color: 'text-red-500' },
                { name: 'TikTok', count: mediaKit?.tiktokFollowers || '—', color: 'text-foreground' },
                { name: 'Instagram', count: mediaKit?.instagramFollowers || '—', color: 'text-pink-500' },
                { name: 'Facebook', count: mediaKit?.facebookFollowers || '—', color: 'text-blue-500' },
              ].map((platform) => (
                <div
                  key={platform.name}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-6 transition-transform hover:-translate-y-0.5"
                >
                  <span className={`text-2xl font-bold ${platform.color}`}>{platform.count}</span>
                  <span className="mt-1 text-sm text-muted-foreground">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MILESTONES TIMELINE */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">Journey</h2>
          <div className="mt-8">
            {sortedYears.length > 0 ? (
              <TimelineClient milestonesByYear={milestonesByYear} sortedYears={sortedYears} />
            ) : (
              <p className="text-muted-foreground">Milestones coming soon.</p>
            )}
          </div>
        </section>

        {/* HIGHLIGHT REEL */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">Best of FweezyTech</h2>
          <div className="mt-6 aspect-video overflow-hidden rounded-xl">
            <iframe
              src={`https://www.youtube.com/embed/${HIGHLIGHT_REEL_VIDEO_ID}`}
              title="FweezyTech Highlight Reel"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="lazy"
            />
          </div>
        </section>

        {/* AWARDS & RECOGNITION */}
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground">Awards & Recognition</h2>
            {awards.docs.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {awards.docs.map((award) => (
                  <div
                    key={award.id}
                    className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center"
                  >
                    <span className="text-4xl" aria-hidden="true">🏆</span>
                    <h3 className="mt-3 font-semibold text-foreground">{award.awardName as string}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{award.awardingBody as string}</p>
                    <span className="mt-2 inline-block rounded-full bg-brand-primary/10 px-3 py-0.5 text-xs font-medium text-brand-primary">
                      {award.year as number}
                    </span>
                    {award.awardUrl && (
                      <a
                        href={award.awardUrl as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 text-sm text-brand-primary hover:underline"
                      >
                        View announcement →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">
                  Awards showcase — coming soon. We're just getting started.
                </p>
                <Link
                  href="/press"
                  className="mt-3 inline-block text-sm font-medium text-brand-primary hover:underline"
                >
                  Know of an award we should apply for? Tell us.
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* PRESS MENTIONS */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">In the Press</h2>
          <p className="mt-4 text-muted-foreground">
            Press mentions will appear here as FweezyTech gains coverage.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <a
              href="/api/media-kit/download"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
            >
              Download Press Kit
            </a>
            <Link
              href="/press"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Press Inquiries
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}