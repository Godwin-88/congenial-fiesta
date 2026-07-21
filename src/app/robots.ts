export const dynamic = "force-dynamic"

export default function robots(): Response {
  const body = `User-agent: *
Allow: /
Disallow: /admin/
Sitemap: https://fweezytech.com/sitemap.xml`

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
