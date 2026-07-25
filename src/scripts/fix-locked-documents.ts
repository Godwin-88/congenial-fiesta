#!/usr/bin/env tsx
/**
 * Fix the `payload_locked_documents_rels` table by adding missing columns
 * for collections that were added after the initial schema sync.
 *
 * Usage: npx tsx src/scripts/fix-locked-documents.ts
 */

import { config } from 'dotenv'
import pg from 'pg'

const { Client } = pg

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const MISSING_COLUMNS: { name: string; type: string }[] = [
  { name: 'brands_id', type: 'integer' },
  { name: 'devices_id', type: 'integer' },
  { name: 'videos_id', type: 'integer' },
  { name: 'articles_id', type: 'integer' },
  { name: 'coming_soon_id', type: 'integer' },
  { name: 'sponsors_id', type: 'integer' },
  { name: 'sponsorship_packages_id', type: 'integer' },
  { name: 'milestones_id', type: 'integer' },
  { name: 'awards_id', type: 'integer' },
  { name: 'media_kit_id', type: 'integer' },
]

async function fixLockedDocuments() {
  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    console.log('Connected to database\n')

    // Check which columns exist
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'payload_locked_documents_rels'
    `)
    const existingColumns = new Set(result.rows.map((r: { column_name: string }) => r.column_name))

    console.log(`Found ${existingColumns.size} existing columns in payload_locked_documents_rels`)
    console.log(`Columns: ${[...existingColumns].join(', ')}\n`)

    for (const col of MISSING_COLUMNS) {
      if (existingColumns.has(col.name)) {
        console.log(`  ✓ ${col.name} already exists`)
      } else {
        console.log(`  + Adding ${col.name} (${col.type})...`)
        await client.query(`
          ALTER TABLE "payload_locked_documents_rels"
          ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};
        `)
        console.log(`    Done`)
      }
    }

    console.log('\nMigration complete! The payload_locked_documents error should now be resolved.')
    console.log('Please restart your dev server and try accessing the Payload admin.')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixLockedDocuments()