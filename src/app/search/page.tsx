import { hybridCatalogSearch, logSearchQuery } from '@/lib/search/server-search'
import { DeviceCard } from '@/components/devices/DeviceCard'
import { ArticleCard } from '@/components/articles/ArticleCard'
import SearchBar from '@/components/search/SearchBar'

export const metadata = {
  title: 'Search | FweezyTech',
  description: 'Search devices, reviews, videos and articles on FweezyTech',
}

const suggestedDevices = ['Samsung Galaxy S25 Ultra', 'iPhone 16 Pro Max', 'Google Pixel 9 Pro', 'Tecno Phantom V Fold2']

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 200)
  const typeFilter = params.type as 'device' | 'article' | 'video' | undefined

  // One shared hybrid (Postgres → Upstash BM25 → semantic) — the page can never
  // disagree with /api/search about what "search" found. The committed page-load
  // is also the single analytics logging point (preview keystrokes are excluded).
  const hybrid = q ? await hybridCatalogSearch(q, { type: typeFilter, semanticTopK: 8 }) : null
  const results = hybrid?.results ?? []
  const layers = hybrid?.layers ?? []

  if (q) {
    // fire-and-forget analytics — never block the render on logging
    void logSearchQuery(q, results.length).catch(() => {})
  }

  const typeTabs = [
    { value: '', label: 'All' },
    { value: 'device', label: 'Devices' },
    { value: 'article', label: 'Articles' },
    { value: 'video', label: 'Videos' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Large search bar */}
      <div className="max-w-2xl mx-auto">
        <SearchBar
          placeholder="Search devices, reviews, comparisons..."
          autoFocus
          className="w-full"
        />
      </div>

      {!q && (
        <div className="mt-20 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Search FweezyTech
          </h1>
          <p className="mt-3 text-lg text-foreground/60">
            Find your next device, read reviews, or watch videos
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {suggestedDevices.map((name) => (
              <a
                key={name}
                href={`/search?q=${encodeURIComponent(name)}`}
                className="rounded-full bg-muted px-4 py-2 text-sm text-foreground/60 hover:bg-muted/80 transition-colors"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      )}

      {q && (
        <div className="mt-8">
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {typeTabs.map((tab) => {
              const isActive = tab.value === '' ? !typeFilter : tab.value === typeFilter
              return (
                <a
                  key={tab.value}
                  href={tab.value ? `/search?q=${encodeURIComponent(q)}&type=${tab.value}` : `/search?q=${encodeURIComponent(q)}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-primary text-white'
                      : 'bg-muted text-foreground/60 hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </a>
              )
            })}
          </div>

          <p className="text-sm text-foreground/50 mb-2">
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{q}&rdquo;
          </p>
          {q && (
            <p className="mb-6 text-xs text-foreground/40">
              {layers.includes('postgres')
                ? 'Matched against the live catalog.'
                : layers.length > 0
                  ? 'Matched against the search index (catalog fallback found nothing).'
                  : 'Catalog and indexes returned nothing — this query lands in the zero-result backlog below.'}
            </p>
          )}

          {results.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-foreground/40">No results for &ldquo;{q}&rdquo;</p>
              <p className="mt-2 text-sm text-foreground/40">Try searching for…</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestedDevices.map((name) => (
                  <a
                    key={name}
                    href={`/search?q=${encodeURIComponent(name)}`}
                    className="rounded-full bg-muted px-4 py-2 text-sm text-foreground/60 hover:bg-muted/80 transition-colors"
                  >
                    {name}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id}>
                  {/* Render based on type — simplified list view */}
                  <a
                    href={result.url}
                    className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    {result.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.imageUrl}
                        alt=""
                        className="h-16 w-24 flex-shrink-0 rounded-lg bg-muted object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground/60">
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        </span>
                        {result.score !== undefined && (
                          <span className="text-sm font-semibold text-score-high">{result.score}</span>
                        )}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-foreground hover:text-brand-primary transition-colors">
                        {result.title}
                      </h3>
                      {result.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-foreground/50">
                          {result.description}
                        </p>
                      )}
                      {result.brand && (
                        <p className="mt-0.5 text-xs text-foreground/40">{result.brand}</p>
                      )}
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}