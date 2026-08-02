-- Migration 013: Add package_interest column to sponsor_inquiries
-- Run this in Supabase SQL Editor
-- Safe for databases where 008 was already applied (table exists without the column)
-- or where the table may not yet exist (no-op)

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sponsor_inquiries') THEN
        IF NOT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'sponsor_inquiries'
              AND column_name = 'package_interest'
        ) THEN
            ALTER TABLE sponsor_inquiries ADD COLUMN package_interest TEXT;
            RAISE NOTICE 'Added package_interest column to sponsor_inquiries';
        ELSE
            RAISE NOTICE 'package_interest column already exists';
        END IF;
    ELSE
        RAISE NOTICE 'sponsor_inquiries table does not exist yet; skipped (run 008 first)';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS inquiries_package_idx ON sponsor_inquiries(package_interest);
