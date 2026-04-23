-- SEC-4: Block anonymous listing of public buckets.
-- Public buckets continue to serve direct object URLs (used as <img src>) without these policies.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;