import Link from 'next/link'
import Image from 'next/image'

type ArticleCardProps = {
  slug: string
  title: string
  excerpt?: string | null
  featuredImage?: string | null
  category?: string | null
  readingTimeMinutes?: number | null
  publishedAt?: string | null
}

const categoryColors: Record<string, string> = {
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  comparison: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  news: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'buying-guide': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  opinion: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

export function ArticleCard({ slug, title, excerpt, featuredImage, category, readingTimeMinutes, publishedAt }: ArticleCardProps) {
  const catColor = category ? categoryColors[category] ?? 'bg-muted text-foreground/70' : 'bg-muted text-foreground/70'
  const catLabel = category ? category.replace('-', ' ') : ''

  return (
    <Link
      href={`/articles/${slug}`}
      className="group rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {featuredImage && (
          <Image
            src={featuredImage}
            alt={title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="p-4">
        {category && (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${catColor}`}>
            {catLabel}
          </span>
        )}
        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-foreground group-hover:text-brand-primary transition-colors">
          {title}
        </h3>
        {excerpt && (
          <p className="mt-1 line-clamp-3 text-sm text-foreground/60">
            {excerpt}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-foreground/50">
          {readingTimeMinutes && <span>{readingTimeMinutes} min read</span>}
          {publishedAt && <span>{new Date(publishedAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
        </div>
      </div>
    </Link>
  )
}