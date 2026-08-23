-- Migration 017: Create device-images storage bucket for admin device uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'device-images',
  'device-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies only if they do not already exist.
DO $$
DECLARE
  policy_exists text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view device images'
  ) THEN
    CREATE POLICY "Public can view device images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'device-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload device images'
  ) THEN
    CREATE POLICY "Authenticated users can upload device images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'device-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update device images'
  ) THEN
    CREATE POLICY "Authenticated users can update device images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'device-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete device images'
  ) THEN
    CREATE POLICY "Authenticated users can delete device images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'device-images');
  END IF;
END $$;
