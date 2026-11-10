-- =================================================================
--  Migration : Ajout du Soft Delete (deleted_at)
-- =================================================================
--  Cette migration ajoute la colonne deleted_at aux tables sites
--  et surveys pour permettre la suppression logique (soft delete).
--  Les politiques RLS sont mises à jour pour filtrer automatiquement
--  les éléments supprimés logiquement.
-- =================================================================

-- =================================================================
--  1. AJOUT DE LA COLONNE deleted_at
-- =================================================================

-- Table sites
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.sites.deleted_at IS 'Date et heure de la suppression logique. NULL si l''élément est actif.';

-- Table surveys
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.surveys.deleted_at IS 'Date et heure de la suppression logique. NULL si l''élément est actif.';

-- =================================================================
--  2. INDEX POUR LES PERFORMANCES
-- =================================================================
-- Ajout d'index pour améliorer les performances des requêtes
-- qui filtrent sur deleted_at

CREATE INDEX IF NOT EXISTS idx_sites_deleted_at ON public.sites(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_surveys_deleted_at ON public.surveys(deleted_at) WHERE deleted_at IS NULL;

-- =================================================================
--  3. MISE À JOUR DES POLITIQUES RLS
-- =================================================================

-- --- Table `sites` ---

-- LECTURE : Filtrer les sites supprimés logiquement
DROP POLICY IF EXISTS "sites_select_for_authenticated_users" ON public.sites;
CREATE POLICY "sites_select_for_authenticated_users" ON public.sites
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- MODIFICATION : Ne permettre la modification que des sites non supprimés
DROP POLICY IF EXISTS "sites_update_for_authenticated_users" ON public.sites;
CREATE POLICY "sites_update_for_authenticated_users" ON public.sites
  FOR UPDATE TO authenticated 
  USING (deleted_at IS NULL) 
  WITH CHECK (deleted_at IS NULL);

-- SUPPRESSION : Ne permettre la suppression physique que des sites non supprimés logiquement
DROP POLICY IF EXISTS "sites_delete_for_owner" ON public.sites;
CREATE POLICY "sites_delete_for_owner" ON public.sites
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND deleted_at IS NULL);

-- LECTURE CORBEILLE : Permettre la lecture des sites supprimés par le propriétaire
DROP POLICY IF EXISTS "sites_select_deleted_for_owner" ON public.sites;
CREATE POLICY "sites_select_deleted_for_owner" ON public.sites
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- RESTAURATION : Permettre la restauration des sites supprimés par le propriétaire
DROP POLICY IF EXISTS "sites_restore_for_owner" ON public.sites;
CREATE POLICY "sites_restore_for_owner" ON public.sites
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id AND deleted_at IS NOT NULL)
  WITH CHECK (auth.uid() = user_id);

-- SUPPRESSION DÉFINITIVE : Permettre la suppression physique des sites supprimés logiquement par le propriétaire
DROP POLICY IF EXISTS "sites_permanent_delete_for_owner" ON public.sites;
CREATE POLICY "sites_permanent_delete_for_owner" ON public.sites
  FOR DELETE TO authenticated USING (auth.uid() = user_id AND deleted_at IS NOT NULL);

-- --- Table `surveys` ---

-- LECTURE : Filtrer les fiches supprimées logiquement
DROP POLICY IF EXISTS "surveys_select_for_authenticated_users" ON public.surveys;
CREATE POLICY "surveys_select_for_authenticated_users" ON public.surveys
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

-- MODIFICATION : Ne permettre la modification que des fiches non supprimées
DROP POLICY IF EXISTS "surveys_update_for_authenticated_users" ON public.surveys;
CREATE POLICY "surveys_update_for_authenticated_users" ON public.surveys
  FOR UPDATE TO authenticated 
  USING (deleted_at IS NULL) 
  WITH CHECK (deleted_at IS NULL);

-- SUPPRESSION : Ne permettre la suppression physique que des fiches non supprimées logiquement
DROP POLICY IF EXISTS "surveys_delete_for_owner" ON public.surveys;
CREATE POLICY "surveys_delete_for_owner" ON public.surveys
  FOR DELETE TO authenticated USING (auth.uid() = created_by AND deleted_at IS NULL);

-- LECTURE CORBEILLE : Permettre la lecture des fiches supprimées par le créateur
DROP POLICY IF EXISTS "surveys_select_deleted_for_owner" ON public.surveys;
CREATE POLICY "surveys_select_deleted_for_owner" ON public.surveys
  FOR SELECT TO authenticated USING (auth.uid() = created_by AND deleted_at IS NOT NULL);

-- RESTAURATION : Permettre la restauration des fiches supprimées par le créateur
DROP POLICY IF EXISTS "surveys_restore_for_owner" ON public.surveys;
CREATE POLICY "surveys_restore_for_owner" ON public.surveys
  FOR UPDATE TO authenticated 
  USING (auth.uid() = created_by AND deleted_at IS NOT NULL)
  WITH CHECK (auth.uid() = created_by);

-- SUPPRESSION DÉFINITIVE : Permettre la suppression physique des fiches supprimées logiquement par le créateur
DROP POLICY IF EXISTS "surveys_permanent_delete_for_owner" ON public.surveys;
CREATE POLICY "surveys_permanent_delete_for_owner" ON public.surveys
  FOR DELETE TO authenticated USING (auth.uid() = created_by AND deleted_at IS NOT NULL);

-- =================================================================
--                   FIN DE LA MIGRATION
-- =================================================================

