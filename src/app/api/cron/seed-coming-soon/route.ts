import { NextResponse } from "next/server"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import Parser from "rss-parser"
import { createServerClient } from "@supabase/ssr"

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "FweezyTech-Cron/1.0" },
})

const FEEDS = [
  "https://www.gsmarena.com/rss-news-reviews.php",
  "https://www.theverge.com/rss/index.xml",
  "https://www.androidauthority.com/feed/",
  "https://9to5google.com/feed/",
]

const BRAND_KEYWORDS = [
  "iphone", "ipad", "galaxy", "pixel", "oneplus", "xiaomi", "redmi",
  "oppo", "vivo", "honor", "nothing", "motorola", "razr", "fold",
  "snapdragon", "apple", "samsung", "google pixel", "pixel",
]

const LAUNCH_SIGNALS = [
  "launch", "upcoming", "rumor", "rumoured", "leak", "expected",
  "announced", "pre-order", "coming soon", "teaser", "reveal",
  "unveil", "launching", "available", "release date",
]

function isDeviceItem(title: string, contentSnippet: string): boolean {
  const haystack = `${title} ${contentSnippet}`.toLowerCase()
  const hasBrand = BRAND_KEYWORDS.some((kw) => haystack.includes(kw))
  const hasSignal = LAUNCH_SIGNALS.some((kw) => haystack.includes(kw))
  return hasBrand && hasSignal
}

function extractDeviceName(title: string): string | null {
  const cleaned = title
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^\(.*?\)\s*/, "")
    .replace(/\s*[-|:].*$/, "")
    .trim()

  const match = cleaned.match(
    /((?:iPhone|iPad|Galaxy|Pixel|OnePlus|Xiaomi|Redmi|Oppo|Vivo|Honor|Nothing|Motorola|Razr|Fold)[\w\s\+\-]*?)(?:\s*\(|\s*-|\s*:|\s*$)/i
  )
  if (match && match[1].trim().length > 3) {
    return match[1].trim()
  }
  if (cleaned.length > 5 && cleaned.length < 60) {
    return cleaned
  }
  return null
}

function inferExpectedWeek(pubDate: Date): string {
  const now = new Date()
  const diffDays = Math.floor((pubDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const target = new Date(now)
  target.setDate(target.getDate() + Math.max(diffDays + 14, 7))

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const month = months[target.getMonth()]
  const year = target.getFullYear()
  return `Expected ${month} ${year}`
}

function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export const GET = verifySignatureAppRouter(async () => {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return NextResponse.json({ error: "Missing signing key" }, { status: 500 })
  }

  const supabase = getAdminClient()

  // Fetch existing active coming-soon items
  const { data: existing } = await supabase
    .from("coming_soon")
    .select("device_name")
    .eq("active", true)

  const existingNames = new Set(
    (existing ?? []).map((d: { device_name: string }) => d.device_name.toLowerCase())
  )

  let fetched = 0
  let created = 0
  let skipped = 0

  for (const feedUrl of FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl)
      fetched += feed.items.length

      for (const item of feed.items) {
        const title = item.title || ""
        const contentSnippet = item.contentSnippet || item.content || ""

        if (!isDeviceItem(title, contentSnippet)) continue

        const deviceName = extractDeviceName(title)
        if (!deviceName) continue

        const normalized = deviceName.toLowerCase().trim()
        if (existingNames.has(normalized)) {
          skipped++
          continue
        }

        try {
          await supabase.from("coming_soon").insert({
            device_name: deviceName,
            expected_week: inferExpectedWeek(new Date(item.pubDate || Date.now())),
            teaser: contentSnippet.slice(0, 160).replace(/\s+/g, " ").trim(),
            active: true,
          })
          existingNames.add(normalized)
          created++
        } catch {
          skipped++
        }
      }
    } catch (err) {
      console.error(`Failed to fetch feed ${feedUrl}:`, err)
    }
  }

  return NextResponse.json({
    status: "ok",
    fetched,
    created,
    skipped,
    feeds: FEEDS.length,
  })
})