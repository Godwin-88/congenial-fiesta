-- Migration 022: Make price_tier optional.
-- The flagship/mid-range/budget/ultra-premium tiers are not assigned at
-- ingestion time; they will be derived later from the device price. The
-- column previously had a NOT NULL / empty-string default that rejected
-- inserts lacking an explicit tier.

ALTER TABLE public.devices ALTER COLUMN price_tier DROP DEFAULT;
ALTER TABLE public.devices ALTER COLUMN price_tier DROP NOT NULL;
