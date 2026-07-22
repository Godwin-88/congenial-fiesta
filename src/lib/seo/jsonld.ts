interface Device {
  slug: string
  name: string
  tagline?: string
  images?: { url: string }[]
  buyLinks?: { retailer: string; price?: string; url?: string }[]
  scores?: { overall?: number }
  verdict?: { bottomLine?: string }
}

interface Article {
  slug: string
  title: string
  excerpt?: string
  featuredImage?: string
  publishedAt?: string
  updatedAt?: string
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface FaqItem {
  q: string
  a: string
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FweezyTech',
    url: 'https://fweezytech.com',
    description: "Kenya's #1 Tech Review Destination",
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://fweezytech.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FweezyTech',
    url: 'https://fweezytech.com',
    logo: 'https://fweezytech.com/icons/icon-512.png',
    sameAs: [
      'https://www.youtube.com/@fweezytech',
      'https://www.tiktok.com/@fweezytech',
      'https://www.instagram.com/fweezytech',
      'https://www.facebook.com/fweezytech',
    ],
  }
}

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Fweezy',
    jobTitle: 'Tech Content Creator',
    url: 'https://fweezytech.com/about',
    sameAs: [
      'https://www.youtube.com/@fweezytech',
      'https://www.tiktok.com/@fweezytech',
      'https://www.instagram.com/fweezytech',
      'https://www.facebook.com/fweezytech',
    ],
    worksFor: { '@type': 'Organization', name: 'FweezyTech' },
    knowsAbout: ['Smartphones', 'Consumer Electronics', 'Tech Reviews', 'Kenya Technology'],
  }
}

export function deviceJsonLd(device: Device, brandName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: device.name,
    description: device.tagline || `${device.name} review by FweezyTech`,
    brand: { '@type': 'Brand', name: brandName },
    image: device.images?.[0]?.url || undefined,
    offers: (device.buyLinks || []).map((link) => ({
      '@type': 'Offer',
      price: link.price?.replace(/[^0-9.]/g, '') || undefined,
      priceCurrency: 'KES',
      availability: 'https://schema.org/InStock',
      url: link.url || undefined,
      seller: { '@type': 'Organization', name: link.retailer },
    })),
    review: device.scores?.overall
      ? {
          '@type': 'Review',
          author: { '@type': 'Person', name: 'Fweezy' },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: device.scores.overall,
            bestRating: 100,
            worstRating: 0,
          },
          reviewBody: device.verdict?.bottomLine || undefined,
        }
      : undefined,
  }
}

export function articleJsonLd(article: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || undefined,
    image: article.featuredImage || undefined,
    author: { '@type': 'Person', name: 'Fweezy', url: 'https://fweezytech.com/about' },
    publisher: {
      '@type': 'Organization',
      name: 'FweezyTech',
      logo: { '@type': 'ImageObject', url: 'https://fweezytech.com/icons/icon-512.png' },
    },
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://fweezytech.com/articles/${article.slug}`,
    },
  }
}

export function videoJsonLd(video: {
  title: string
  thumbnailUrl: string
  publishedAt: string
  embedId: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${video.embedId}`,
    publisher: { '@type': 'Organization', name: 'FweezyTech' },
  }
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `https://fweezytech.com${item.url}`,
    })),
  }
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}