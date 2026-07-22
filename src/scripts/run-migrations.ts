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
