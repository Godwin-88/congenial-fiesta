import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://fweezytech.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/devices/',
          '/articles/',
          '/videos',
          '/compare',
          '/search',
          '/about',
          '/press',
          '/coming-soon',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/advertise',
          '/_next/',
          '/static/',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Omgilibot',
          'FacebookBot',
          'Applebot-Extended',
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}