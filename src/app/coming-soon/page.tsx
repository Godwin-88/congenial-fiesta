import { getActiveComingSoon } from '@/lib/videos/queries'
import { TeaserCard } from '@/components/coming-soon/TeaserCard'
import NotifyForm from '@/components/coming-soon/NotifyForm'

export const metadata = {
  title: 'Coming Soon | FweezyTech',
  description: "Fweezy is working on these reviews. Be the first to know when they drop.",
}

export default async function ComingSoonPage() {
  const items = await getActiveComingSoon().catch(() => [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Coming Soon to FweezyTech
        </h1>
        <p className="mt-3 text-lg text-foreground/60">
          Fweezy is working on these. Be the first to know.
        </p>
      </div>

      {/* Teaser Cards Grid */}
      {items.length === 0 ? (
        <div className="mt-12 text-center text-foreground/40">
          <p>Nothing coming soon right now — check back later!</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {items.map((item: any) => (
            <TeaserCard
              key={item.id}
              id={item.id}
              deviceName={item.deviceName}
              silhouetteImage={item.silhouetteImage}
              expectedWeek={item.expectedWeek}
              teaser={item.teaser}
            />
          ))}
        </div>
      )}

      {/* Notify Me Form */}
      <div id="notify" className="mt-16 border-t border-border pt-12">
        <NotifyForm />
      </div>
    </div>
  )
}