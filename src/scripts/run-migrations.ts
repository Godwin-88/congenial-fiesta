#!/usr/bin/env tsx

/**
 * Run Supabase community migrations in order using pg.
 * Usage: npx tsx src/scripts/run-migrations.ts
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

const { Client } = pg

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

if (!databaseUrl) {
  console.error('Missing DATABASE_URL or DIRECT_URL in .env.local')
  process.exit(1)
}

const migrations = [
  '003_community_users.sql',
  '004_ratings.sql',
  '005_comments.sql',
  '006_verified_owner.sql',
  '007_page_views.sql',
  '007_saved_comparisons.sql',
  '008_sponsor_inquiries.sql',
  '009_analytics_aggregate.sql',
  '010_admin_cms.sql',
  '011_user_features.sql',
  '012_storage_buckets.sql',
  '013_add_package_interest.sql',
  '014_fix_column_and_grants.sql',
  '015_add_device_images.sql',
  '016_align_devices_schema.sql',
  '017_device_images_bucket.sql',
  '018_network_and_drop_benchmarks.sql',
  '019_device_categories.sql',
  '020_device_types_grants.sql',
  '021_rename_brands_logo.sql',
  '022_price_tier_optional.sql',
  '023_fix_search_vector_trigger.sql',
  '024_release_year_optional.sql',
  '024b_clear_draft_devices.sql',
  '025_seed_phones_batch1.sql',
  '026_agent_run_log.sql',
  '027_drop_devices_not_null.sql',
  '028_device_purchase_features.sql',
]

async function runMigrations() {
  const client = new Client({ connectionString: databaseUrl })
  
  try {
    await client.connect()
    console.log('Connected to Supabase Postgres\n')

    for (const migration of migrations) {
      const path = join(process.cwd(), 'src/lib/db/migrations', migration)
      console.log(`Running ${migration}...`)
      
      const sql = readFileSync(path, 'utf-8')
      
      try {
        await client.query(sql)
        console.log(`  ✓ ${migration} complete\n`)
      } catch (err) {
        console.error(`  ✗ Error in ${migration}:`, err)
      }
    }

    console.log('All migrations complete!')
  } catch (err) {
    console.error('Connection error:', err)
  } finally {
    await client.end()
  }
}

runMigrations()
