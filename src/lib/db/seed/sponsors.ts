import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

async function seed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Seed sponsors
  const sponsors = [
    {
      company_name: 'Safaricom',
      logo_url: 'https://placehold.co/200x80?text=Safaricom',
      partnership_type: 'dedicated-video',
      active: true,
      display_order: 1,
    },
    {
      company_name: 'Jumia Kenya',
      logo_url: 'https://placehold.co/200x80?text=Jumia',
      partnership_type: 'shoutout',
      active: true,
      display_order: 2,
    },
    {
      company_name: 'Tecno Mobile',
      logo_url: 'https://placehold.co/200x80?text=Tecno',
      partnership_type: 'full-campaign',
      active: true,
      display_order: 3,
    },
  ]

  for (const sponsor of sponsors) {
    try {
      await supabase.from('sponsors').insert(sponsor)
      console.log(`✅ Created sponsor: ${sponsor.company_name}`)
    } catch (err) {
      console.error(`❌ Failed to create sponsor ${sponsor.company_name}:`, err)
    }
  }

  // Seed sponsorship packages
  const packages = [
    {
      name: 'Shoutout',
      tier: 'starter',
      highlighted: false,
      display_order: 1,
      description: "A dedicated mention in one of Fweezytech's videos reaching his full audience.",
      deliverables: [
        { item: '30-second verbal shoutout' },
        { item: 'Brand link in video description' },
        { item: 'Story mention across Instagram and Facebook' },
      ],
    },
    {
      name: 'Dedicated Video',
      tier: 'pro',
      highlighted: true,
      display_order: 2,
      description: 'A full video dedicated to your product or service, reviewed by Fweezy.',
      deliverables: [
        { item: '5–10 minute dedicated review' },
        { item: 'Pinned comment with brand link' },
        { item: 'Cross-posted to TikTok and Instagram Reels' },
        { item: 'Feature on FweezyTech website device page' },
      ],
    },
    {
      name: 'Full Campaign',
      tier: 'premium',
      highlighted: false,
      display_order: 3,
      description: 'A complete multi-platform campaign across all FweezyTech channels.',
      deliverables: [
        { item: 'Dedicated video + 3 short-form clips' },
        { item: 'Website feature article' },
        { item: 'Email mention to subscriber list' },
        { item: '30-day pinned social post' },
        { item: 'Monthly analytics report' },
      ],
    },
  ]

  for (const pkg of packages) {
    try {
      await supabase.from('sponsorship_packages').insert(pkg)
      console.log(`✅ Created package: ${pkg.name}`)
    } catch (err) {
      console.error(`❌ Failed to create package ${pkg.name}:`, err)
    }
  }

  // Seed MediaKit record
  try {
    await supabase.from('media_kit').insert({
      label: 'FweezyTech Media Kit 2026',
      short_bio: "FweezyTech is Kenya's #1 tech content creator, delivering honest, in-depth reviews of smartphones, gadgets, and consumer electronics to a growing audience across East Africa.",
      long_bio: 'FweezyTech is a premier technology content creator based in Kenya, dedicated to providing honest, thorough, and accessible reviews of smartphones, gadgets, and consumer electronics. With a focus on the East African market, FweezyTech bridges the gap between global tech trends and local relevance, helping consumers make informed purchasing decisions. Known for detailed benchmarks, real-world camera tests, battery life evaluations, and value-for-money analysis, FweezyTech has become the go-to source for tech enthusiasts in Kenya, Uganda, Tanzania, and beyond. Content spans YouTube, TikTok, Instagram, and Facebook, reaching millions of viewers monthly.',
      total_followers: '150K+',
      total_views: '5M+',
      years_active: 5,
      youtube_followers: '100K',
      tiktok_followers: '35K',
      instagram_followers: '10K',
      facebook_followers: '5K',
      brand_colours: [
        { name: 'Electric Blue', hex: '#0066FF', rgb: '0, 102, 255' },
        { name: 'Amber', hex: '#F59E0B', rgb: '245, 158, 11' },
        { name: 'Charcoal', hex: '#111827', rgb: '17, 24, 39' },
        { name: 'White', hex: '#FFFFFF', rgb: '255, 255, 255' },
      ],
      active: true,
    })
    console.log('✅ Created MediaKit record')
  } catch (err) {
    console.error('❌ Failed to create MediaKit record:', err)
  }

  console.log('\nSeed complete!')
}

seed()