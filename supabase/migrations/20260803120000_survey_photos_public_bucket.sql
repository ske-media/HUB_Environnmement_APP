-- =================================================================
--  Bucket `survey-photos` : passage en public + RLS storage
-- =================================================================
--  Contexte : le frontend persiste dans `surveys.specific_data` des URLs
--  générées par `getPublicUrl()`. Le bucket ayant été créé avec
--  `public = false`, ces URLs renvoyaient un 403 Forbidden dès qu'une fiche
--  était rechargée ou consultée par un autre utilisateur.
--
--  Migration idempotente : peut être rejouée sans effet de bord.
-- =================================================================

-- 1. Le bucket doit exister (cas d'une base créée avant 0000_initial_schema).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-photos',
  'survey-photos',
  true,
  10485760, -- 10 Mo, largement au-dessus de la cible de compression client (1 Mo)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Passage en public + garde-fous taille / type MIME.
UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'survey-photos';

-- 3. Politiques RLS sur storage.objects.
--    Écriture (INSERT / UPDATE / DELETE) : utilisateurs authentifiés.
DROP POLICY IF EXISTS "storage_insert_for_authenticated" ON storage.objects;
CREATE POLICY "storage_insert_for_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_update_for_authenticated" ON storage.objects;
CREATE POLICY "storage_update_for_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'survey-photos')
  WITH CHECK (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_delete_for_authenticated" ON storage.objects;
CREATE POLICY "storage_delete_for_authenticated" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_select_for_authenticated" ON storage.objects;
CREATE POLICY "storage_select_for_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'survey-photos');

-- 4. Lecture ouverte : indispensable pour que les `getPublicUrl()` restent
--    valides hors session (affichage différé, embed PDF, partage de fiche).
DROP POLICY IF EXISTS "survey_photos_select_public" ON storage.objects;
CREATE POLICY "survey_photos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-photos');
