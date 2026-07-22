import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getArticle, getAllArticlePaths, getArticlesForDevice, getRecentArticles } from '@/lib/articles/queries'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { ArticleCard } from '@/components/articles/ArticleCard'
import CommentsSection from '@/components/community/CommentsSection'
import { Suspense } from 'react'
import CommentsSkeleton from '@/components/community/CommentsSkeleton'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  const paths = await getAllArticlePaths().catch(() => [])
  return paths
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return { title: 'Article Not Found | FweezyTech' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = article as any

  return {
    title: a.seo?.metaTitle ?? `${a.title} | FweezyTech`,
    description: a.seo?.metaDescription ?? a.excerpt ?? '',
    openGraph: a.featuredImage ? { images: [a.featuredImage] } : undefined,
  }
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = article as any

  // Fetch related articles
  const relatedArticles = a.associatedDevice
    ? await getArticlesForDevice(typeof a.associatedDevice === 'object' ? a.associatedDevice.slug : '').catch(() => [])
    : await getRecentArticles(3).catch(() => [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-foreground/50">
        <Link href="/" className="hover:text-brand-primary transition-colors">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/articles" className="hover:text-brand-primary transition-colors">Articles</Link>
        {a.category && (
          <>
            <span className="mx-2">›</span>
            <Link href={`/articles?category=${a.category}`} className="hover:text-brand-primary transition-colors">
              {a.category.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </Link>
          </>
        )}
        <span className="mx-2">›</span>
        <span className="text-foreground/70">{a.title}</span>
      </nav>

      {/* Hero */}
      <article>
        {a.featuredImage && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl mb-8">
            <Image
              src={a.featuredImage}
              alt={a.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

        <div className="flex items-center gap-3 text-sm text-foreground/50 mb-4">
          {a.category && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70">
              {a.category.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </span>
          )}
          {a.readingTimeMinutes && <span>{a.readingTimeMinutes} min read</span>}
          {a.publishedAt && (
            <span>
              {new Date(a.publishedAt).toLocaleDateString('en-KE', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          )}
        </div>

        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
          {a.title}
        </h1>

        {a.excerpt && (
          <p className="mt-4 text-lg text-foreground/60 leading-relaxed">
            {a.excerpt}
          </p>
        )}

        {/* Author */}
        <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white">
            F
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Fweezy</p>
            <p className="text-xs text-foreground/50">Tech Reviewer</p>
          </div>
        </div>

        {/* Article Body */}
        <div className="mt-10">
          <ArticleBody body={a.body} />
        </div>
      </article>

      {/* Associated Device Card */}
      {a.associatedDevice && typeof a.associatedDevice === 'object' && (
        <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-3">
            Device Reviewed in This Article
          </p>
          <Link
            href={`/devices/${a.associatedDevice.slug ?? ''}/${a.associatedDevice.slug ?? ''}`}
            className="text-lg font-semibold text-brand-primary hover:underline"
          >
            {a.associatedDevice.name ?? 'View Device'}
          </Link>
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.slice(0, 3).map((ra) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const r = ra as any
              return (
                <ArticleCard
                  key={r.id}
                  slug={r.slug}
                  title={r.title}
                  excerpt={r.excerpt}
                  featuredImage={r.featuredImage}
                  category={r.category}
                  readingTimeMinutes={r.readingTimeMinutes}
                  publishedAt={r.publishedAt}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Comments */}
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsSection contentType="article" contentSlug={slug} />
      </Suspense>

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: a.title,
            author: { '@type': 'Person', name: 'Fweezy' },
            datePublished: a.publishedAt,
            dateModified: a.updatedAt ?? a.publishedAt,
            image: a.featuredImage,
            publisher: { '@type': 'Organization', name: 'FweezyTech' },
          }),
        }}
      />
    </div>
  )
}