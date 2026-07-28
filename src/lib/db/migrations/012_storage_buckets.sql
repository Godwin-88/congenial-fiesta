-- Migration 012: Create Supabase Storage buckets for article images
-- Run this in the Supabase SQL Editor

-- 1. Create the article-images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read images (anyone can view)
CREATE POLICY "Public can view article images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'article-images');

-- 3. Allow authenticated users (admins) to upload images
CREATE POLICY "Authenticated users can upload article images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'article-images');

-- 4. Allow authenticated users (admins) to update images
CREATE POLICY "Authenticated users can update article images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'article-images');

-- 5. Allow authenticated users (admins) to delete images
CREATE POLICY "Authenticated users can delete article images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'article-images');