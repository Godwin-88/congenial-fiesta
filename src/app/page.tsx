import Link from 'next/link'
import { getTopDevices, getFeaturedBrands } from '@/lib/devices/queries'
import { getRecentArticles } from '@/lib/articles/queries'
import { fetchTopYouTubeVideos } from '@/lib/youtube/client'
import { getActiveComingSoon } from '@/lib/videos/queries'
import { DeviceCard } from '@/components/devices/DeviceCard'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { VideoCard } from '@/components/videos/VideoCard'
import { TeaserCard } from '@/components/coming-soon/TeaserCard'
import SearchBar from '@/components/search/SearchBar'

export default async function Home() {
  const [topDevices, featuredBrands, recentArticles, topVideos, comingSoonItems] = await Promise.all([
    getTopDevices(6).catch(() => []),
    getFeaturedBrands().catch(() => []),
    getRecentArticles(3).catch(() => []),
    fetchTopYouTubeVideos(4).catch(() => []),
    getActiveComingSoon().catch(() => []),
  ])

  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Kenya's #1 Tech Review Destination
          </h1>
          <p className="mt-6 text-lg leading-8 text-foreground/70">
            Honest, in-depth device reviews and comparisons to help you make the right choice.
          </p>
          <div className="mt-10 flex justify-center">
            <SearchBar
              placeholder="Search devices, reviews, comparisons..."
              className="w-full max-w-2xl"
            />
          </div>
        </div>
      </section>

      {/* Top Brands strip */}
      {featuredBrands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6">
            {featuredBrands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/devices?brand=${brand.slug}`}
                className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {brand.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt="" className="h-6 w-6 rounded-full object-contain" />
                )}
                {brand.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest Devices */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Latest Devices</h2>
            <p className="mt-1 text-foreground/60">Top-rated devices reviewed by Fweezy</p>
          </div>
          <Link
            href="/devices"
            className="text-sm font-medium text-brand-primary hover:underline"
          >
            View all devices →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {topDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      </section>

      {/* Latest Videos */}
      {topVideos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Latest Videos</h2>
              <p className="mt-1 text-foreground/60">Watch Fweezy's latest reviews and unboxings</p>
            </div>
            <Link
              href="/videos"
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              View all videos →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {topVideos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnailUrl}
                platform="youtube"
                viewCount={video.viewCount}
                duration={video.duration}
                publishedAt={video.publishedAt}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Articles */}
      {recentArticles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Latest Articles</h2>
              <p className="mt-1 text-foreground/60">In-depth reviews, comparisons and guides</p>
            </div>
            <Link
              href="/articles"
              className="text-sm font-medium text-brand-primary hover:underline"
            >
              View all articles →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map((article) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const a = article as any
              return (
                <ArticleCard
                  key={a.id}
                  slug={a.slug}
                  title={a.title}
                  excerpt={a.excerpt}
                  featuredImage={a.featuredImage}
                  category={a.category}
                  readingTimeMinutes={a.readingTimeMinutes}
                  publishedAt={a.publishedAt}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Coming Soon */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="font-heading text-xl font-bold text-foreground">Coming Soon</h3>
            <p className="mt-2 text-foreground/60">
              Fweezy is working on these reviews. Be the first to know.
            </p>
          </div>
          {comingSoonItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
              {comingSoonItems.slice(0, 3).map((item: any) => (
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
          ) : (
            <p className="text-center text-foreground/40">
              Nothing coming soon right now — check back later!
            </p>
          )}
          {comingSoonItems.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                href="/coming-soon"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                See all upcoming reviews →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}