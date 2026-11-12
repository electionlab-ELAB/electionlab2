-- ElectionLab: one-time candidate headshot upload support.
-- Paste into Supabase SQL Editor. Keeps existing tables and poll data intact.
-- Requires existing public.is_admin() from your ElectionLab admin setup.

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('candidate-photos','candidate-photos',true,4194304,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public,
  file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "ElectionLab candidate photos public view" ON storage.objects;
CREATE POLICY "ElectionLab candidate photos public view" ON storage.objects
  FOR SELECT TO anon,authenticated
  USING (bucket_id='candidate-photos');

DROP POLICY IF EXISTS "ElectionLab admin uploads candidate photos" ON storage.objects;
CREATE POLICY "ElectionLab admin uploads candidate photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id='candidate-photos' AND public.is_admin());

DROP POLICY IF EXISTS "ElectionLab admin deletes candidate photos" ON storage.objects;
CREATE POLICY "ElectionLab admin deletes candidate photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id='candidate-photos' AND public.is_admin());

-- To enable candidate roster CRUD, also run ADMIN-SETUP-2028.sql once
-- if your public.primary_candidates table does not exist yet.
