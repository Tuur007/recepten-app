-- Storage bucket voor receptfoto's. Pad-conventie: {family_id}/{recipe_id}.jpg
-- Bucket is public (read), dus geen SELECT-policy nodig. Schrijfrechten zijn
-- beperkt tot de eigen family-map via my_family_id().
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-images', 'recipe-images', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "family upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = public.my_family_id()::text
);

CREATE POLICY "family update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = public.my_family_id()::text
);

CREATE POLICY "family delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = public.my_family_id()::text
);
