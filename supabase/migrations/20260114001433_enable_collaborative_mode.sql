-- Migration : Activation du mode collaboratif - tous les utilisateurs authentifiés ont accès à tous les sites et fiches
-- Date : 2026-01-14

-- =================================================================
-- POLITIQUES RLS POUR LA TABLE sites - MODE COLLABORATIF
-- =================================================================

-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "super_admin_can_view_all_sites" ON sites;
DROP POLICY IF EXISTS "super_admin_can_update_all_sites" ON sites;
DROP POLICY IF EXISTS "super_admin_can_soft_delete_all_sites" ON sites;

-- SELECT : Tous les utilisateurs authentifiés peuvent voir tous les sites
CREATE POLICY "authenticated_users_can_view_all_sites"
  ON sites FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE : Tous les utilisateurs authentifiés peuvent modifier tous les sites
CREATE POLICY "authenticated_users_can_update_all_sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE (Soft Delete) : Tous les utilisateurs authentifiés peuvent soft delete tous les sites
CREATE POLICY "authenticated_users_can_soft_delete_all_sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (deleted_at IS NOT NULL);

-- INSERT : Déjà permis par authenticated_users_can_insert_sites, on le laisse tel quel

-- =================================================================
-- POLITIQUES RLS POUR LA TABLE surveys - MODE COLLABORATIF
-- =================================================================

-- Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "super_admin_can_view_all_surveys" ON surveys;
DROP POLICY IF EXISTS "super_admin_can_update_all_surveys" ON surveys;
DROP POLICY IF EXISTS "super_admin_can_soft_delete_all_surveys" ON surveys;

-- SELECT : Tous les utilisateurs authentifiés peuvent voir tous les surveys
CREATE POLICY "authenticated_users_can_view_all_surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : Tous les utilisateurs authentifiés peuvent créer des surveys pour tous les sites
DROP POLICY IF EXISTS "authenticated_users_can_insert_surveys" ON surveys;
CREATE POLICY "authenticated_users_can_insert_surveys"
  ON surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE : Tous les utilisateurs authentifiés peuvent modifier tous les surveys
CREATE POLICY "authenticated_users_can_update_all_surveys"
  ON surveys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE (Soft Delete) : Tous les utilisateurs authentifiés peuvent soft delete tous les surveys
CREATE POLICY "authenticated_users_can_soft_delete_all_surveys"
  ON surveys FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (deleted_at IS NOT NULL);

-- =================================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =================================================================
COMMENT ON POLICY "authenticated_users_can_view_all_sites" ON sites IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent voir tous les sites';
COMMENT ON POLICY "authenticated_users_can_update_all_sites" ON sites IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent modifier tous les sites';
COMMENT ON POLICY "authenticated_users_can_soft_delete_all_sites" ON sites IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent supprimer (soft delete) tous les sites';
COMMENT ON POLICY "authenticated_users_can_view_all_surveys" ON surveys IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent voir tous les surveys';
COMMENT ON POLICY "authenticated_users_can_insert_surveys" ON surveys IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent créer des surveys pour tous les sites';
COMMENT ON POLICY "authenticated_users_can_update_all_surveys" ON surveys IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent modifier tous les surveys';
COMMENT ON POLICY "authenticated_users_can_soft_delete_all_surveys" ON surveys IS 'Mode collaboratif : tous les utilisateurs authentifiés peuvent supprimer (soft delete) tous les surveys';
