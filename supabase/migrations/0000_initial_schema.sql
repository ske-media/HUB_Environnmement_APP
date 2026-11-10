/*
  ================================================================
  ==         HUB ENVIRONNEMENT - SCHEMA FINAL COLLABORATIF        ==
  ================================================================

  Migration unique pour la mise en place de la base de données.
  Cette version est optimisée pour une application collaborative où
  tous les utilisateurs peuvent voir et modifier les données,
  tout en conservant des permissions spécifiques pour la création
  et la suppression.

  Principes de conception :
  - La base de données assure l'intégrité relationnelle et les types de données de base.
  - La validation de la structure complexe des objets JSON est déléguée à l'application (Zod).
  - La sécurité est gérée par RLS (Row Level Security) dès le départ pour un modèle collaboratif.
  - Les performances sont préparées avec des index pertinents.

  Contenu :
  1. Types personnalisés (ENUMs)
  2. Table `sites`
  3. Table `surveys`
  4. Fonctions d'horodatage automatique
  5. Politiques de sécurité (RLS) pour le mode collaboratif
  6. Bucket de stockage pour les photos
  7. Index pour les performances
*/

-- =================================================================
--  1. TYPES PERSONNALISÉS (ENUMs)
-- =================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'site_status') THEN
    CREATE TYPE public.site_status AS ENUM (
      'active',
      'archived'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'survey_type') THEN
    CREATE TYPE public.survey_type AS ENUM (
      'soil',
      'groundwater',
      'gas',
      'ambient_air',
      'surface_water',
      'pid',
      'piezometric',
      'tap_water',
      'sediment',
      'excavation',
      'risk_analysis',
      'radon_soil',
      'site_visit',
      'equipment_tracking',
      'garden_questionnaire',
      'icpe_visit'
    );
  END IF;
END$$;


-- =================================================================
--  2. TABLE `sites`
-- =================================================================
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  project_number TEXT NOT NULL,
  location TEXT,
  city TEXT,
  coordinates JSONB,
  project_manager TEXT,
  engineer_in_charge TEXT,
  drilling_company TEXT,
  status public.site_status NOT NULL DEFAULT 'active'
);

COMMENT ON TABLE public.sites IS 'Dossiers des chantiers et sites d''étude.';
COMMENT ON COLUMN public.sites.user_id IS 'L''utilisateur qui a initialement créé le site.';
COMMENT ON COLUMN public.sites.coordinates IS 'Stocke les coordonnées géographiques du site. Ex: { "latitude": 48.85, "longitude": 2.35 }';


-- =================================================================
--  3. TABLE `surveys`
-- =================================================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type public.survey_type NOT NULL,
  specific_data JSONB NOT NULL
);

COMMENT ON TABLE public.surveys IS 'Fiches de terrain pour chaque type de sondage (sol, eau, etc.).';
COMMENT ON COLUMN public.surveys.specific_data IS 'Données spécifiques au type de sondage, dont la structure est validée par l''application.';


-- =================================================================
--  4. FONCTIONS D'HORODATAGE AUTOMATIQUE
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_sites_update ON public.sites;
CREATE TRIGGER on_sites_update
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS on_surveys_update ON public.surveys;
CREATE TRIGGER on_surveys_update
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();


-- =================================================================
--  5. SÉCURITÉ (ROW LEVEL SECURITY - MODE COLLABORATIF)
-- =================================================================
-- Activation de RLS et définition des politiques d'accès.

-- --- Table `sites` ---
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- INSERTION : Seul un utilisateur connecté peut créer un site pour lui-même.
DROP POLICY IF EXISTS "sites_insert_for_user" ON public.sites;
CREATE POLICY "sites_insert_for_user" ON public.sites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- LECTURE : N'importe quel utilisateur connecté peut voir TOUS les sites.
DROP POLICY IF EXISTS "sites_select_for_authenticated_users" ON public.sites;
CREATE POLICY "sites_select_for_authenticated_users" ON public.sites
  FOR SELECT TO authenticated USING (true);

-- MODIFICATION : N'importe quel utilisateur connecté peut modifier TOUS les sites.
DROP POLICY IF EXISTS "sites_update_for_authenticated_users" ON public.sites;
CREATE POLICY "sites_update_for_authenticated_users" ON public.sites
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SUPPRESSION : Seul le créateur original du site peut le supprimer.
DROP POLICY IF EXISTS "sites_delete_for_owner" ON public.sites;
CREATE POLICY "sites_delete_for_owner" ON public.sites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- --- Table `surveys` ---
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- INSERTION : N'importe quel utilisateur connecté peut créer une fiche sur un site existant.
DROP POLICY IF EXISTS "surveys_insert_for_authenticated_users" ON public.surveys;
CREATE POLICY "surveys_insert_for_authenticated_users" ON public.surveys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM public.sites WHERE id = site_id));

-- LECTURE : N'importe quel utilisateur connecté peut voir TOUTES les fiches.
DROP POLICY IF EXISTS "surveys_select_for_authenticated_users" ON public.surveys;
CREATE POLICY "surveys_select_for_authenticated_users" ON public.surveys
  FOR SELECT TO authenticated USING (true);

-- MODIFICATION : N'importe quel utilisateur connecté peut modifier TOUTES les fiches.
DROP POLICY IF EXISTS "surveys_update_for_authenticated_users" ON public.surveys;
CREATE POLICY "surveys_update_for_authenticated_users" ON public.surveys
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SUPPRESSION : Seul le créateur original de la fiche peut la supprimer.
DROP POLICY IF EXISTS "surveys_delete_for_owner" ON public.surveys;
CREATE POLICY "surveys_delete_for_owner" ON public.surveys
  FOR DELETE TO authenticated USING (auth.uid() = created_by);


-- =================================================================
--  6. STOCKAGE (STORAGE BUCKET)
-- =================================================================
-- Bucket public : le frontend construit les URLs via `getPublicUrl()` et les
-- persiste dans `surveys.specific_data`. Un bucket privé rendrait ces URLs
-- inaccessibles (403) après rechargement.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-photos',
  'survey-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Politiques de sécurité pour le stockage des photos
DROP POLICY IF EXISTS "storage_insert_for_authenticated" ON storage.objects;
CREATE POLICY "storage_insert_for_authenticated" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_select_for_authenticated" ON storage.objects;
CREATE POLICY "storage_select_for_authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_update_for_authenticated" ON storage.objects;
CREATE POLICY "storage_update_for_authenticated" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'survey-photos');

DROP POLICY IF EXISTS "storage_delete_for_authenticated" ON storage.objects;
CREATE POLICY "storage_delete_for_authenticated" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'survey-photos');

-- Lecture ouverte : nécessaire pour l'affichage des `getPublicUrl()` dans les
-- fiches et pour l'embed des photos dans les PDF générés.
DROP POLICY IF EXISTS "survey_photos_select_public" ON storage.objects;
CREATE POLICY "survey_photos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-photos');


-- =================================================================
--  7. INDEX POUR LES PERFORMANCES
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON public.sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON public.sites(status);
CREATE INDEX IF NOT EXISTS idx_surveys_site_id ON public.surveys(site_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_surveys_type ON public.surveys(type);
CREATE INDEX IF NOT EXISTS idx_surveys_specific_data_gin ON public.surveys USING GIN (specific_data);


-- =================================================================
--                   FIN DE LA MIGRATION
-- =================================================================