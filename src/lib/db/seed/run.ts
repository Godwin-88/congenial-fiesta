#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

async function run() {
  // Dynamic import to ensure env vars are loaded first
  const { getPayload } = await import('payload')
  const payloadConfig = (await import('@payload-config')).default
  const { seedBrands, seedDevices } = await import('./devices')

  const payload = await getPayload({ config: payloadConfig })

  console.log('🌱 Seeding database...')

  // Seed brands
  const brandMap = new Map<string, string>()
  for (const brand of seedBrands) {
    const existing = await payload.find({
      collection: 'brands',
      where: { slug: { equals: brand.slug } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      brandMap.set(brand.slug, String(existing.docs[0].id))
      console.log(`  ✓ Brand "${brand.name}" already exists`)
    } else {
      const created = await payload.create({
        collection: 'brands',
        data: brand,
      })
      brandMap.set(brand.slug, String(created.id))
      console.log(`  ✓ Created brand "${brand.name}"`)
    }
  }

  // Seed devices
  for (const device of seedDevices) {
    const brandSlug = device.brand as unknown as string
    const brandId = brandMap.get(brandSlug)

    if (!brandId) {
      console.error(`  ✗ Brand "${brandSlug}" not found — skipping device "${device.name}"`)
      continue
    }

    const existing = await payload.find({
      collection: 'devices',
      where: { slug: { equals: device.slug } },
      limit: 1,
      depth: 0,
    })

    const deviceData = {
      ...device,
      brand: brandId,
    }

    if (existing.docs.length > 0) {
      // Update existing
      try {
        const result = await payload.update({
          collection: 'devices',
          id: String(existing.docs[0].id),
          data: deviceData,
        })
        console.log(`  ✓ Updated device "${device.name}" (id: ${result.id})`)
      } catch (err: any) {
        console.error(`  ✗ Failed to update device "${device.name}":`, JSON.stringify(err?.data?.errors ?? err?.message, null, 2))
        throw err
      }
    } else {
      try {
        const result = await payload.create({
          collection: 'devices',
          data: deviceData,
        })
        console.log(`  ✓ Created device "${device.name}" (id: ${result.id})`)
      } catch (err: any) {
        console.error(`  ✗ Failed to create device "${device.name}":`, JSON.stringify(err?.data?.errors ?? err?.message, null, 2))
        throw err
      }
    }
  }

  console.log('✅ Seed complete!')
  process.exit(0)
}

run().catch((error) => {
  console.error('❌ Seed failed:', error)
  process.exit(1)
})