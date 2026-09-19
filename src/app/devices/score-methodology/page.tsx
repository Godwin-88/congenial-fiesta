import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/seo/JsonLd'
import { organizationJsonLd } from '@/lib/seo/jsonld'
import { CATEGORY_MAX, FORMULA_VERSION, THRESHOLDS } from '@/lib/ranking/config'

export const metadata: Metadata = {
  title: 'How the FweezyTech Score works | FweezyTech',
  description:
    'The FweezyTech Score is one deterministic number out of 100 built from build quality, display, performance, cameras and battery — no opinions, no brand bias, no paid placements.',
  openGraph: {
    images: [{ url: '/api/og/default?title=How+the+FweezyTech+Score+works', width: 1200, height: 630 }],
  },
}

export const revalidate = 86400

const CATEGORIES = [
  {
    key: 'build',
    label: 'Build Quality',
    max: CATEGORY_MAX.build,
    summary: 'Water/dust protection, front glass, frame material and back material.',
    detail:
      'Protection is graded on the published IP rating. Glass, frame and back are graded against a materials hierarchy that is updated as new materials reach the market.',
  },
  {
    key: 'display',
    label: 'Display',
    max: CATEGORY_MAX.display,
    summary: 'Panel type, resolution, refresh rate, brightness and HDR support.',
    detail:
      'Brightness is the single biggest display input. Manufacturer marketing figures are discounted unless the panel has been independently measured.',
  },
  {
    key: 'performance',
    label: 'Performance',
    max: CATEGORY_MAX.performance,
    summary: 'Processor benchmarks, memory capacity + generation, and storage capacity + technology.',
    detail:
      'Processor scores come from aggregated, source-tracked benchmark results measured against the current best chipset in the database. Core counts, clocks and marketing names never score on their own.',
  },
  {
    key: 'cameras',
    label: 'Cameras',
    max: CATEGORY_MAX.cameras,
    summary: 'Main, telephoto, ultrawide, selfie and macro cameras, plus video capability.',
    detail:
      'Each camera is scored on sensor size, aperture, stabilisation and autofocus. Megapixels alone earn nothing, and a device is never rewarded merely for having more lenses. Optical zoom is scored; digital zoom is not.',
  },
  {
    key: 'battery',
    label: 'Battery & Charging',
    max: CATEGORY_MAX.battery,
    summary: 'Capacity, wired charging speed and wireless charging speed.',
    detail:
      'Charging is measured against the fastest currently available standard, so the category stays competitive as charging technology improves.',
  },
] as const

export default function RankingMethodologyPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd()]} />

      <header className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">FweezyTech Scoring · {FORMULA_VERSION}</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          How the FweezyTech Score works
        </h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-foreground/90">
          Every device on FweezyTech carries one number out of 100. It is calculated by a fixed,
          published formula from the device&apos;s own hardware specifications — not from opinions,
          press samples, sponsorship or brand reputation. Identical specifications always produce an
          identical score, and the score updates automatically whenever a device&apos;s specs or the
          wider benchmark landscape change.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground">The five categories</h2>
          <p className="mt-3 leading-relaxed text-foreground/90">
            The 100 points are split across five fixed categories. The maximum for each category is
            part of the formula itself and only changes with a published formula version.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <article key={c.key} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-heading text-base font-bold text-foreground">{c.label}</h3>
                  <span className="text-sm font-semibold text-brand-primary">{c.max} pts</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{c.summary}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.detail}</p>
              </article>
            ))}
          </div>
        </section>


        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold text-foreground">Principles we hold to</h2>
          <ul className="mt-4 space-y-3 text-foreground/90">
            <li>
              <strong className="text-foreground">One number in public.</strong> Device pages show the
              final score only. The full component breakdown stays in our admin tools so it can be
              audited without overwhelming readers.
            </li>
            <li>
              <strong className="text-foreground">Specifications only.</strong> Price, availability and
              the brand never influence the score. Value for money is a separate editorial judgement.
            </li>
            <li>
              <strong className="text-foreground">Unknown is not zero.</strong> If a device&apos;s
              specifications are incomplete, the score is calculated from what is known and the missing
              fields are recorded — we never assume a &quot;No&quot;.
            </li>
            <li>
              <strong className="text-foreground">Scores never freeze.</strong> A device is scored
              against the current best in the market, so an older device&apos;s score can move as better
              hardware arrives. That is intentional: it keeps comparisons honest.
            </li>
            <li>
              <strong className="text-foreground">Every value is sourced.</strong> Each specification is
              traceable to a named source with a retrieval date, and our editors can override any value
              — an override is recorded and never silently replaced.
            </li>
          </ul>
        </section>


        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold text-foreground">Benchmarks</h2>
          <p className="mt-3 leading-relaxed text-foreground/90">
            Processor performance is measured against the strongest chipset currently in our database
            for single-core, multi-core and graphics performance. Where several credible results exist
            we use aggregated medians rather than a single favourable figure. Battery, charging,
            brightness and camera references work the same way: roughly {THRESHOLDS.batteryMah} mAh,{' '}
            {THRESHOLDS.wiredW} W wired, {THRESHOLDS.wirelessW} W wireless and{' '}
            {THRESHOLDS.brightnessNits} nits are the current ceilings they are scaled against.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold text-foreground">Versioning</h2>
          <p className="mt-3 leading-relaxed text-foreground/90">
            The formula is versioned ({FORMULA_VERSION} today). Every stored score records the formula
            version and the benchmark snapshot it was calculated against, so a past score can always be
            explained. When the formula improves, existing devices are recalculated with the new version
            — consistency across the database matters more than preserving old numbers.
          </p>
        </section>

        <section className="mt-12 rounded-lg border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-bold text-foreground">Spotted something wrong?</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            Specifications come from manufacturer documentation and reputable spec sources. If a
            specification or score looks incorrect, tell us — corrections are verified against a source
            and the device is rescored immediately.{' '}
            <Link href="/contact" className="text-brand-primary hover:underline">
              Contact FweezyTech
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  )
}
