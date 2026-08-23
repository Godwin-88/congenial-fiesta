'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import SectionHeading from './SectionHeading'
import type { Article } from '@/types/cms'

type Props = {
  articles: Article[]
}

export default function ArticlesSection({ articles }: Props) {
  const featured = articles[0]
  const rest = articles.slice(1, 4)

  return (
    <section className="py-16 md:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="INSIGHTS"
          title="From the FweezyTech Blog"
          tagline="Deep dives, buying guides, and Fweezytech's takes on what matters."
          viewAllHref="/articles"
        />

        {articles.length > 0 ? (
          <>
            {/* Featured Article */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-xl border border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/[0.08] p-6 md:p-8 mb-6 hover:border-brand-primary/60 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    {featured.featured_image ? (
                      <Image src={featured.featured_image} alt={featured.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No image</div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {featured.category && (
                      <span className="inline-block rounded bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary uppercase tracking-wider">
                        {featured.category}
                      </span>
                    )}
                    <h3 className="text-xl md:text-2xl font-bold text-foreground font-heading leading-snug">
                      {featured.title}
                    </h3>
                    {featured.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{featured.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {featured.reading_time_minutes && (
                        <span>{featured.reading_time_minutes} min read</span>
                      )}
                      {featured.published_at && (
                        <span>{new Date(featured.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <Link href={`/articles/${featured.slug}`}>
                      <span className="inline-flex items-center gap-1 text-brand-primary font-medium text-sm hover:underline">
                        Read Article →
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Article Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((article, i) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <Link href={`/articles/${article.slug}`}>
                      <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-brand-primary/40 transition-colors h-full">
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {article.featured_image ? (
                            <Image src={article.featured_image} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 100vw, 33vw" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No image</div>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          {article.category && (
                            <span className="text-xs text-brand-primary font-medium uppercase tracking-wider">{article.category}</span>
                          )}
                          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{article.title}</h3>
                          {article.excerpt && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-1">
                            {article.reading_time_minutes && <span>{article.reading_time_minutes} min read</span>}
                            {article.published_at && <span>{new Date(article.published_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden"
              >
                <div className="aspect-video flex items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <span className="text-4xl opacity-30">📝</span>
                  </div>
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Articles dropping soon</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/articles" className="text-brand-primary text-sm font-medium hover:underline">
            See all articles →
          </Link>
        </div>
      </div>
    </section>
  )
}