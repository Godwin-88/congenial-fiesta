import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

export default async function AboutPage() {
  const supabase = await getSupabase()

  const [milestonesResult, awardsResult] = await Promise.all([
    supabase.from('milestones').select('*').order('year', { ascending: false }).order('display_order', { ascending: true }),
    supabase.from('awards').select('*').order('year', { ascending: false }).order('display_order', { ascending: true }),
  ])

  let mediaKitResult: { data: Record<string, unknown> | null } = { data: null }
  try {
    const { data } = await supabase.from('media_kit').select('*').eq('active', true).limit(1).single()
    mediaKitResult = { data: data as unknown as Record<string, unknown> | null }
  } catch {
    mediaKitResult = { data: null }
  }

  const milestones = milestonesResult.data ?? []
  const awards = awardsResult.data ?? []
  const mediaKit = mediaKitResult as unknown as { data: Record<string, unknown> | null } | null
  const kit = mediaKit?.data ?? null

  // Group milestones by year
  const milestonesByYear: Record<number, Array<{ id: string; year: number; title: string; description?: string | null; displayOrder?: number | null }>> = {}
  for (const m of milestones) {
    const year = Number(m.year)
    if (!milestonesByYear[year]) milestonesByYear[year] = []
    milestonesByYear[year].push({
      id: String(m.id),
      year,
      title: String(m.title ?? ''),
      description: m.description !== null ? String(m.description) : null,
      displayOrder: m.display_order ?? null,
    })
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
              <div className="order-2 lg:order-1">
                <div className="mx-auto h-80 w-80 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 sm:h-96 sm:w-96">
                  <div className="flex h-full items-center justify-center">
                    <span className="text-6xl font-bold text-brand-primary/30">Fweezy</span>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2">
                <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Meet Fweezy
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-foreground/70">
                  {(kit?.short_bio as string) ||
                    "Kenya's leading tech content creator, bringing you honest, in-depth reviews of the latest smartphones and gadgets."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {(kit?.total_followers as string | number | boolean | null | undefined) && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {String(kit?.total_followers)} Followers
                    </div>
                  )}
                  {(kit?.total_views as string | number | boolean | null | undefined) && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {String(kit?.total_views)} Views
                    </div>
                  )}
                  {(kit?.years_active as string | number | boolean | null | undefined) && (
                    <div className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground">
                      {Number(kit?.years_active)} Years Active
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="https://www.youtube.com/@fweezytech" target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                     aria-label="Follow on YouTube">YouTube</a>
                  <a href="https://www.tiktok.com/@fweezytech" target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                     aria-label="Follow on TikTok">TikTok</a>
                  <a href="https://www.instagram.com/fweezytech" target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-700"
                     aria-label="Follow on Instagram">Instagram</a>
                  <a href="https://www.facebook.com/fweezytech" target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                     aria-label="Follow on Facebook">Facebook</a>
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
              {(kit?.long_bio as string) ||
                "FweezyTech started as a passion project — one person with a camera, a love for tech, and a mission to bring honest, relatable reviews to the Kenyan audience."}
            </p>
          </div>
        </section>

        {/* SOCIAL PROOF BAR */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {[
                { name: 'YouTube', count: kit?.youtube_followers ? String(kit.youtube_followers) : '—', color: 'text-red-500' },
                { name: 'TikTok', count: kit?.tiktok_followers ? String(kit.tiktok_followers) : '—', color: 'text-foreground' },
                { name: 'Instagram', count: kit?.instagram_followers ? String(kit.instagram_followers) : '—', color: 'text-pink-500' },
                { name: 'Facebook', count: kit?.facebook_followers ? String(kit.facebook_followers) : '—', color: 'text-blue-500' },
              ].map((platform) => (
                <div key={platform.name} className="flex flex-col items-center rounded-xl border border-border bg-card p-6 transition-transform hover:-translate-y-0.5">
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
            {awards.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {awards.map((award: Record<string, unknown>) => (
                  <div key={String(award.id)} className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center">
                    <span className="text-4xl" aria-hidden="true">🏆</span>
                    <h3 className="mt-3 font-semibold text-foreground">{String(award.award_name)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{String(award.awarding_body)}</p>
                    <span className="mt-2 inline-block rounded-full bg-brand-primary/10 px-3 py-0.5 text-xs font-medium text-brand-primary">
                      {Number(award.year)}
                    </span>
                    {!!award.award_url && (
                      <a href={String(award.award_url)} target="_blank" rel="noopener noreferrer"
                         className="mt-3 text-sm text-brand-primary hover:underline">View announcement →</a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">Awards showcase — coming soon.</p>
                <Link href="/press" className="mt-3 inline-block text-sm font-medium text-brand-primary hover:underline">
                  Know of an award we should apply for? Tell us.
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* PRESS MENTIONS */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">In the Press</h2>
          <p className="mt-4 text-muted-foreground">Press mentions will appear here as FweezyTech gains coverage.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <a href="/api/media-kit/download"
               className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary/90">
              Download Press Kit
            </a>
            <Link href="/press"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50">
              Press Inquiries
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}