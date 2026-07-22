import { config } from 'dotenv'
config({ path: '.env.local' })

import { getPayload } from 'payload'

async function seed() {
  const { default: payloadConfig } = await import('@payload-config')
  const payload = await getPayload({ config: payloadConfig })

  // Seed sponsors
  const sponsors = [
    {
      companyName: 'Safaricom',
      logo: 'https://placehold.co/200x80?text=Safaricom',
      partnershipType: 'dedicated-video',
      active: true,
      displayOrder: 1,
    },
    {
      companyName: 'Jumia Kenya',
      logo: 'https://placehold.co/200x80?text=Jumia',
      partnershipType: 'shoutout',
      active: true,
      displayOrder: 2,
    },
    {
      companyName: 'Tecno Mobile',
      logo: 'https://placehold.co/200x80?text=Tecno',
      partnershipType: 'full-campaign',
      active: true,
      displayOrder: 3,
    },
  ]

  for (const sponsor of sponsors) {
    try {
      await payload.create({
        collection: 'sponsors',
        data: sponsor,
      })
      console.log(`✅ Created sponsor: ${sponsor.companyName}`)
    } catch (err) {
      console.error(`❌ Failed to create sponsor ${sponsor.companyName}:`, err)
    }
  }

  // Seed sponsorship packages
  const packages = [
    {
      name: 'Shoutout',
      tier: 'starter',
      highlighted: false,
      displayOrder: 1,
      description: "A dedicated mention in one of Fweezy's videos reaching his full audience.",
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
      displayOrder: 2,
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
      displayOrder: 3,
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
      await payload.create({
        collection: 'sponsorship-packages',
        data: pkg,
      })
      console.log(`✅ Created package: ${pkg.name}`)
    } catch (err) {
      console.error(`❌ Failed to create package ${pkg.name}:`, err)
    }
  }

  // Seed MediaKit record
  try {
    await payload.create({
      collection: 'media-kit',
      data: {
        label: 'FweezyTech Media Kit 2026',
        shortBio: "FweezyTech is Kenya's #1 tech content creator, delivering honest, in-depth reviews of smartphones, gadgets, and consumer electronics to a growing audience across East Africa.",
        longBio: 'FweezyTech is a premier technology content creator based in Kenya, dedicated to providing honest, thorough, and accessible reviews of smartphones, gadgets, and consumer electronics. With a focus on the East African market, FweezyTech bridges the gap between global tech trends and local relevance, helping consumers make informed purchasing decisions. Known for detailed benchmarks, real-world camera tests, battery life evaluations, and value-for-money analysis, FweezyTech has become the go-to source for tech enthusiasts in Kenya, Uganda, Tanzania, and beyond. Content spans YouTube, TikTok, Instagram, and Facebook, reaching millions of viewers monthly.',
        totalFollowers: '150K+',
        totalViews: '5M+',
        yearsActive: 5,
        youtubeFollowers: '100K',
        tiktokFollowers: '35K',
        instagramFollowers: '10K',
        facebookFollowers: '5K',
        brandColours: [
          { name: 'Electric Blue', hex: '#0066FF', rgb: '0, 102, 255' },
          { name: 'Amber', hex: '#F59E0B', rgb: '245, 158, 11' },
          { name: 'Charcoal', hex: '#111827', rgb: '17, 24, 39' },
          { name: 'White', hex: '#FFFFFF', rgb: '255, 255, 255' },
        ],
        active: true,
      },
    })
    console.log('✅ Created MediaKit record')
  } catch (err) {
    console.error('❌ Failed to create MediaKit record:', err)
  }

  console.log('\nSeed complete!')
}

seed()