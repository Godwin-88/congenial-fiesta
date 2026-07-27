import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log('Seeding articles, videos, and coming-soon items...')

  // ── Articles ──────────────────────────────────────────────
  const articles = [
    {
      title: 'Samsung Galaxy S25 Ultra vs iPhone 16 Pro Max: Which Should You Buy in Kenya?',
      slug: 'samsung-galaxy-s25-ultra-vs-iphone-16-pro-max-kenya',
      excerpt: 'The ultimate flagship showdown in Kenya. We compare the Galaxy S25 Ultra and iPhone 16 Pro Max across performance, camera, battery, and value for money.',
      category: 'comparison',
      status: 'published',
      published_at: new Date('2026-02-15').toISOString(),
      reading_time_minutes: 6,
      body_html: '<p>The battle for the best smartphone in Kenya has never been more intense. Samsung\'s Galaxy S25 Ultra and Apple\'s iPhone 16 Pro Max both launched within weeks of each other, and both claim the crown. But which one actually deserves your hard-earned shillings?</p><p>Starting with design, the S25 Ultra features a titanium frame with a flat display — a first for Samsung\'s Ultra line. The iPhone 16 Pro Max also uses titanium but retains its signature rounded edges. Both feel premium, but the S25 Ultra\'s integrated S Pen gives it a productivity edge that the iPhone simply cannot match.</p><p>Camera performance is where things get interesting. The S25 Ultra\'s 200MP main sensor captures incredible detail, while the iPhone 16 Pro Max\'s 48MP sensor excels in video recording. For Kenyan content creators, the iPhone\'s ProRes and Log recording capabilities are hard to beat. However, for photography enthusiasts, the S25 Ultra\'s 10x optical zoom is a game-changer for wildlife and landscape shots.</p>',
    },
    {
      title: 'Best Budget 5G Phones in Kenya Under KES 30,000 (2025)',
      slug: 'best-budget-5g-phones-kenya-2025',
      excerpt: '5G is finally affordable in Kenya. Here are the best budget 5G phones you can buy right now without breaking the bank.',
      category: 'buying-guide',
      status: 'published',
      published_at: new Date('2026-01-20').toISOString(),
      reading_time_minutes: 5,
      body_html: '<p>5G connectivity has become a standard feature even on budget phones in 2025. With Safaricom and Airtel expanding their 5G networks across Nairobi, Mombasa, and other major towns, there\'s never been a better time to upgrade.</p><p>The Infinix Zero 40 5G leads the pack at just under KES 30,000, offering a 120Hz AMOLED display, 8GB of RAM, and a capable 108MP camera. It\'s closely followed by the Tecno Camon 30 Pro 5G, which offers similar specs with a slightly better selfie camera.</p><p>For those on a tighter budget, the Redmi Note 14 5G starts at around KES 22,000 and still delivers solid performance with a 5000mAh battery that easily lasts two days. Whichever you choose, 5G on a budget has never looked this good.</p>',
    },
    {
      title: 'Google Pixel 9 Pro Full Review: Is It Worth It in Kenya?',
      slug: 'google-pixel-9-pro-review-kenya',
      excerpt: 'The Pixel 9 Pro brings Google\'s best camera software and clean Android experience to Kenya. But is it worth the premium over Samsung and Xiaomi?',
      category: 'review',
      status: 'published',
      published_at: new Date('2026-03-01').toISOString(),
      reading_time_minutes: 7,
      body_html: '<p>Google\'s Pixel 9 Pro has finally launched in Kenya through official channels, and it brings with it the best smartphone camera software in the industry. But with a price tag of KES 159,999, it faces stiff competition from the Galaxy S25 and Xiaomi 15 Pro.</p><p>The camera is, without question, the Pixel 9 Pro\'s standout feature. Google\'s computational photography magic delivers stunning results in any lighting condition. The new AI-powered Magic Editor and Best Take features are genuinely useful, not just gimmicks. Portrait mode is best-in-class, with hair detection that even the iPhone struggles with.</p><p>Battery life is solid — a full day of heavy use is easily achievable thanks to the efficient Tensor G4 chip. However, charging speeds lag behind competitors at just 27W wired. In Kenya where power outages are still a reality, the lack of a charger in the box is also a consideration. Overall, if photography is your priority, the Pixel 9 Pro is the best phone you can buy right now.</p>',
    },
  ]

  for (const article of articles) {
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', article.slug)
      .limit(1)

    if (!existing || existing.length === 0) {
      await supabase.from('articles').insert(article)
      console.log(`  ✓ Created article: ${article.title}`)
    } else {
      console.log(`  - Skipped (exists): ${article.title}`)
    }
  }

  // ── CMS Videos ────────────────────────────────────────────
  const cmsVideos = [
    {
      title: 'Samsung Galaxy S25 Ultra Unboxing & First Impressions! 🔥',
      platform: 'tiktok',
      embed_id: 'https://www.tiktok.com/@fweezytech/video/1234567890',
      thumbnail_url: 'https://placehold.co/480x270?text=FweezyTech+TikTok',
      view_count: 45000,
      duration: '1:23',
      published_at: new Date('2026-02-20').toISOString(),
      featured: true,
    },
    {
      title: 'iPhone 16 Pro Max vs S25 Ultra Camera Test',
      platform: 'tiktok',
      embed_id: 'https://www.tiktok.com/@fweezytech/video/1234567891',
      thumbnail_url: 'https://placehold.co/480x270?text=FweezyTech+TikTok',
      view_count: 78000,
      duration: '2:05',
      published_at: new Date('2026-02-18').toISOString(),
      featured: true,
    },
    {
      title: 'Best Budget Phones 2025 - Full Breakdown 📱',
      platform: 'instagram',
      embed_id: 'https://www.instagram.com/reel/1234567890',
      thumbnail_url: 'https://placehold.co/480x270?text=FweezyTech+IG',
      view_count: 12000,
      duration: '0:45',
      published_at: new Date('2026-01-25').toISOString(),
      featured: false,
    },
    {
      title: 'Pixel 9 Pro - The Camera King? Full Review',
      platform: 'facebook',
      embed_id: 'https://www.facebook.com/fweezytech/videos/1234567890',
      thumbnail_url: 'https://placehold.co/480x270?text=FweezyTech+FB',
      view_count: 5600,
      duration: '15:30',
      published_at: new Date('2026-03-02').toISOString(),
      featured: false,
    },
  ]

  for (const video of cmsVideos) {
    await supabase.from('videos').insert(video)
    console.log(`  ✓ Created video: ${video.title}`)
  }

  // ── Coming Soon Items ─────────────────────────────────────
  const comingSoonItems = [
    {
      device_name: 'Samsung Galaxy S25 FE',
      expected_week: 'February 2026',
      teaser: 'The fan-favourite edition is back — flagship features at a mid-range price.',
      active: true,
    },
    {
      device_name: 'iPhone 17 Air',
      expected_week: 'September 2026',
      teaser: 'Apple\'s thinnest iPhone ever. Ultra-slim design, big screen, bold new camera system.',
      active: true,
    },
  ]

  for (const item of comingSoonItems) {
    await supabase.from('coming_soon').insert(item)
    console.log(`  ✓ Created coming-soon: ${item.device_name}`)
  }

  console.log('\n✅ Content seeding complete!')
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })