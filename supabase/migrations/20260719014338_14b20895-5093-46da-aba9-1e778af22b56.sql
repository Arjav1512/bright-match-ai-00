-- Fix storage RLS for avatars & company-logos: recreate policies targeting the
-- authenticated role explicitly, and cover upsert (INSERT + UPDATE + SELECT).

-- AVATARS
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- COMPANY LOGOS
DROP POLICY IF EXISTS "Employers can upload company logo" ON storage.objects;
DROP POLICY IF EXISTS "Employers can update company logo" ON storage.objects;
DROP POLICY IF EXISTS "Employers can delete company logo" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;

CREATE POLICY "Anyone can view company logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "Employers can upload company logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Employers can update company logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Employers can delete company logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
