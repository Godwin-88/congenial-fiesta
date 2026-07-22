import { semanticSearch } from '@/lib/upstash/vector'
import { searchDocuments } from '@/lib/upstash/search'

export type RetrievedDevice = {
  name: string
  slug: string
  brandSlug: string
  score: number | undefined
  tagline: string | undefined
  category: string | undefined
  priceKES: string | undefined
  url: string
}

export type RetrievedArticle = {
  title: string
  slug: string
  excerpt: string | undefined
  category: string | undefined
  url: string
}

export type NavigationCard = {
  type: 'device' | 'article' | 'video' | 'page'
  title: string
  subtitle: string
  url: string
  score?: number
  imageUrl?: string
}

export type RetrievedContext = {
  devices: RetrievedDevice[]
  articles: RetrievedArticle[]
  navigationCards: NavigationCard[]
}

export async function retrieveContext(query: string): Promise<RetrievedContext> {
  const [vectorResults, searchResults] = await Promise.allSettled([
    semanticSearch(query, 6),
    searchDocuments(query),
  ])

  const vectorDocs = vectorResults.status === 'fulfilled' ? vectorResults.value : []
  const searchDocs = searchResults.status === 'fulfilled' ? searchResults.value : []

  const seenIds = new Set(vectorDocs.map(r => r.id))
  const mergedDocs = [
    ...vectorDocs.map(r => ({ id: r.id, metadata: r.metadata, score: r.score })),
    ...searchDocs
      .filter(d => !seenIds.has(d.id))
      .map(d => ({ id: d.id, metadata: d as unknown as Record<string, unknown>, score: 0 })),
  ].slice(0, 8)

  const devices: RetrievedDevice[] = []
  const articles: RetrievedArticle[] = []
  const navigationCards: NavigationCard[] = []

  for (const doc of mergedDocs) {
    const meta = doc.metadata
    const type = (meta.type ?? '') as string

    if (type === 'device') {
      const device: RetrievedDevice = {
        name: (meta.title ?? '') as string,
        slug: ((meta.url as string)?.split('/').pop() ?? '') as string,
        brandSlug: ((meta.url as string)?.split('/')[2] ?? '') as string,
        score: meta.score as number | undefined,
        tagline: meta.description as string | undefined,
        category: meta.category as string | undefined,
        priceKES: meta.priceKES as string | undefined,
        url: meta.url as string,
      }
      devices.push(device)
      navigationCards.push({
        type: 'device',
        title: device.name,
        subtitle: device.tagline ?? device.category ?? 'Device Review',
        url: device.url,
        score: device.score,
        imageUrl: meta.imageUrl as string | undefined,
      })
    }

    if (type === 'article') {
      const article: RetrievedArticle = {
        title: (meta.title ?? '') as string,
        slug: ((meta.url as string)?.split('/').pop() ?? '') as string,
        excerpt: meta.description as string | undefined,
        category: meta.category as string | undefined,
        url: meta.url as string,
      }
      articles.push(article)
      navigationCards.push({
        type: 'article',
        title: article.title,
        subtitle: article.excerpt?.slice(0, 80) ?? article.category ?? 'Article',
        url: article.url,
      })
    }

    if (type === 'video') {
      navigationCards.push({
        type: 'video',
        title: (meta.title ?? 'Video') as string,
        subtitle: 'Watch on FweezyTech',
        url: meta.url as string,
        imageUrl: meta.imageUrl as string | undefined,
      })
    }
  }

  const queryLower = query.toLowerCase()

  if (queryLower.includes('compar')) {
    navigationCards.push({
      type: 'page',
      title: 'Device Comparison Tool',
      subtitle: 'Compare up to 3 devices side by side',
      url: '/compare',
    })
  }

  if (queryLower.includes('coming') || queryLower.includes('upcoming') ||
      queryLower.includes('next') || queryLower.includes('soon')) {
    navigationCards.push({
      type: 'page',
      title: 'Coming Soon',
      subtitle: "See what Fweezy's reviewing next",
      url: '/coming-soon',
    })
  }

  if (queryLower.includes('sponsor') || queryLower.includes('partner') ||
      queryLower.includes('advertis') || queryLower.includes('brand deal')) {
    navigationCards.push({
      type: 'page',
      title: 'Partner with FweezyTech',
      subtitle: 'View sponsorship packages',
      url: '/advertise',
    })
  }

  if (queryLower.includes('about') || queryLower.includes('who is fweezy') ||
      queryLower.includes('creator')) {
    navigationCards.push({
      type: 'page',
      title: 'About Fweezy',
      subtitle: "Meet Kenya's #1 tech content creator",
      url: '/about',
    })
  }

  const seenUrls = new Set<string>()
  const uniqueCards = navigationCards.filter(card => {
    if (seenUrls.has(card.url)) return false
    seenUrls.add(card.url)
    return true
  }).slice(0, 4)

  return { devices, articles, navigationCards: uniqueCards }
}

export function formatContextForPrompt(context: RetrievedContext): string {
  const lines: string[] = []

  if (context.devices.length > 0) {
    lines.push('## Relevant Devices from FweezyTech Database:')
    for (const d of context.devices) {
      lines.push(`- **${d.name}**`)
      if (d.score) lines.push(`  Fweezy Score: ${d.score}/100`)
      if (d.tagline) lines.push(`  "${d.tagline}"`)
      if (d.priceKES) lines.push(`  Price: KES ${d.priceKES}`)
      if (d.category) lines.push(`  Category: ${d.category}`)
      lines.push(`  URL: ${d.url}`)
    }
  }

  if (context.articles.length > 0) {
    lines.push('\n## Relevant Articles:')
    for (const a of context.articles) {
      lines.push(`- **${a.title}**`)
      if (a.excerpt) lines.push(`  ${a.excerpt}`)
      lines.push(`  URL: ${a.url}`)
    }
  }

  return lines.join('\n')
}