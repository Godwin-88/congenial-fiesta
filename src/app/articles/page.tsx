import { getArticles } from '@/lib/articles/queries'
import { ArticleCard } from '@/components/articles/ArticleCard'

export const metadata = {
  title: 'Articles | FweezyTech',
  description: 'In-depth reviews, comparisons, buying guides and tech news from FweezyTech',
}

const categories = [
  { value: '', label: 'All' },
  { value: 'review', label: 'Reviews' },
  { value: 'comparison', label: 'Comparisons' },
  { value: 'news', label: 'News' },
  { value: 'buying-guide', label: 'Buying Guides' },
  { value: 'opinion', label: 'Opinion' },
]

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const params = await searchParams
  const category = params.category ?? ''
  const page = parseInt(params.page ?? '1', 10)

  const { articles, totalPages } = await getArticles({ category: category || undefined, page })

  const activeTab = category || 'all'

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {category ? categories.find((c) => c.value === category)?.label ?? 'Articles' : 'Articles'}
      </h1>

      {/* Category Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeTab === cat.value || (activeTab === 'all' && cat.value === '')
          return (
            <a
              key={cat.value}
              href={cat.value ? `/articles?category=${cat.value}` : '/articles'}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-primary text-white'
                  : 'bg-muted text-foreground/60 hover:bg-muted/80'
              }`}
            >
              {cat.label}
            </a>
          )
        })}
      </div>

      {/* Article Grid */}
      {articles.length === 0 ? (
        <div className="mt-12 text-center text-foreground/40">
          <p>No articles found.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              slug={(article as unknown as { slug: string }).slug}
              title={article.title}
              excerpt={(article as unknown as { excerpt?: string | null }).excerpt}
              featuredImage={(article as unknown as { featuredImage?: string | null }).featuredImage}
              category={(article as unknown as { category?: string | null }).category}
              readingTimeMinutes={(article as unknown as { readingTimeMinutes?: number | null }).readingTimeMinutes}
              publishedAt={(article as unknown as { publishedAt?: string | null }).publishedAt}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={category ? `/articles?category=${category}&page=${p}` : `/articles?page=${p}`}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-brand-primary text-white'
                  : 'bg-muted text-foreground/60 hover:bg-muted/80'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}