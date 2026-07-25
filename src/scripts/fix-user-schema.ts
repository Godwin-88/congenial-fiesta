/**
 * Fixes the users table schema by adding missing columns and creating the
 * users_sessions table required by Payload CMS auth.
 *
 * Usage: npx tsx src/scripts/fix-user-schema.ts
 */
import { config } from 'dotenv'
import pg from 'pg'

const { Client } = pg

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

if (!databaseUrl) {
  console.error('Missing DATABASE_URL or DIRECT_URL in .env.local')
  process.exit(1)
}

async function fixSchema() {
  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    console.log('Connected to database\n')

    // 1. Add display_name column if missing
    console.log('Adding display_name column...')
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'display_name'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "display_name" varchar;
          RAISE NOTICE 'Added display_name column';
        ELSE
          RAISE NOTICE 'display_name column already exists';
        END IF;
      END $$;
    `)
    console.log('  ✓ display_name check complete\n')

    // 2. Create users_sessions table if missing
    console.log('Creating users_sessions table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS "users_sessions" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL DEFAULT 0,
        "_parent_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamp with time zone DEFAULT now(),
        "expires_at" timestamp with time zone,
        "session_token" varchar NOT NULL
      );
    `)
    console.log('  ✓ users_sessions table created\n')

    // 3. Create index on _parent_id for performance
    console.log('Creating index on users_sessions._parent_id...')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_sessions_parent_id
      ON "users_sessions" ("_parent_id");
    `)
    console.log('  ✓ index created\n')

    console.log('Schema fix complete! Restart the dev server to verify.')
  } catch (err) {
    console.error('Error fixing schema:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixSchema()