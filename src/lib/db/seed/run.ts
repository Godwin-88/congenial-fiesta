#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load .env.local BEFORE any other module imports
config({ path: '.env.local' })

async function run() {
  // Dynamic import to ensure env vars are loaded first
  const { createClient } = await import('@supabase/supabase-js')
  const { seedBrands, seedDevices } = await import('./devices')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log('🌱 Seeding database...')

  // Seed brands
  const brandMap = new Map<string, string>()
  for (const brand of seedBrands) {
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', brand.slug)
      .limit(1)

    if (existing && existing.length > 0) {
      brandMap.set(brand.slug, String(existing[0].id))
      console.log(`  ✓ Brand "${brand.name}" already exists`)
    } else {
      const { data: created } = await supabase
        .from('brands')
        .insert(brand as any)
        .select('id')
        .single()
      if (created) {
        brandMap.set(brand.slug, String(created.id))
      }
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

    const deviceData = {
      ...device,
      brand_id: brandId,
    }
    // Remove the old brand field
    delete (deviceData as any).brand

    const { data: existing } = await supabase
      .from('devices')
      .select('id')
      .eq('slug', device.slug)
      .limit(1)

    if (existing && existing.length > 0) {
      // Update existing
      try {
        await supabase
          .from('devices')
          .update(deviceData)
          .eq('slug', device.slug)
        console.log(`  ✓ Updated device "${device.name}"`)
      } catch (err: any) {
        console.error(`  ✗ Failed to update device "${device.name}":`, err?.message ?? err)
        throw err
      }
    } else {
      try {
        await supabase
          .from('devices')
          .insert(deviceData)
        console.log(`  ✓ Created device "${device.name}"`)
      } catch (err: any) {
        console.error(`  ✗ Failed to create device "${device.name}":`, err?.message ?? err)
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