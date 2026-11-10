-- Migration : Mise à jour des politiques RLS pour gérer les rôles super_admin et user
-- Date : 2025-11-20

-- =================================================================
-- FONCTION HELPER : Vérifier si l'utilisateur est super_admin
-- =================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'super_admin',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- POLITIQUES RLS POUR LA TABLE sites
-- =================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;
DROP POLICY IF EXISTS "Users can insert their own sites" ON sites;
DROP POLICY IF EXISTS "Users can update their own sites" ON sites;
DROP POLICY IF EXISTS "Users can delete their own sites" ON sites;

-- SELECT : Les super_admin peuvent voir tous les sites, les user voient leurs sites ou ceux où ils sont engineer_in_charge
CREATE POLICY "super_admin_can_view_all_sites"
  ON sites FOR SELECT
  USING (
    public.is_super_admin() OR
    auth.uid() = user_id OR
    (engineer_in_charge IS NOT NULL AND auth.uid()::text = engineer_in_charge)
  );

-- INSERT : Tout utilisateur authentifié peut créer un site
CREATE POLICY "authenticated_users_can_insert_sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE : Les super_admin peuvent modifier tous les sites, les user seulement leurs sites ou ceux où ils sont engineer_in_charge
CREATE POLICY "super_admin_can_update_all_sites"
  ON sites FOR UPDATE
  USING (
    public.is_super_admin() OR
    auth.uid() = user_id OR
    (engineer_in_charge IS NOT NULL AND auth.uid()::text = engineer_in_charge)
  )
  WITH CHECK (
    public.is_super_admin() OR
    auth.uid() = user_id OR
    (engineer_in_charge IS NOT NULL AND auth.uid()::text = engineer_in_charge)
  );

-- DELETE (Soft Delete) : Les super_admin peuvent soft delete tous les sites, les user seulement leurs sites
CREATE POLICY "super_admin_can_soft_delete_all_sites"
  ON sites FOR UPDATE
  USING (
    public.is_super_admin() OR
    auth.uid() = user_id
  )
  WITH CHECK (
    (public.is_super_admin() OR auth.uid() = user_id) AND
    deleted_at IS NOT NULL
  );

-- =================================================================
-- POLITIQUES RLS POUR LA TABLE surveys
-- =================================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can view surveys from their sites" ON surveys;
DROP POLICY IF EXISTS "Users can insert their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete their own surveys" ON surveys;

-- SELECT : Les super_admin peuvent voir tous les surveys, les user voient ceux de leurs sites
CREATE POLICY "super_admin_can_view_all_surveys"
  ON surveys FOR SELECT
  USING (
    public.is_super_admin() OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = surveys.site_id
      AND (
        sites.user_id = auth.uid() OR
        (sites.engineer_in_charge IS NOT NULL AND sites.engineer_in_charge = auth.uid()::text)
      )
    )
  );

-- INSERT : Tout utilisateur authentifié peut créer un survey
CREATE POLICY "authenticated_users_can_insert_surveys"
  ON surveys FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      public.is_super_admin() OR
      EXISTS (
        SELECT 1 FROM sites
        WHERE sites.id = surveys.site_id
        AND (
          sites.user_id = auth.uid() OR
          (sites.engineer_in_charge IS NOT NULL AND sites.engineer_in_charge = auth.uid()::text)
        )
      )
    )
  );

-- UPDATE : Les super_admin peuvent modifier tous les surveys, les user seulement ceux qu'ils ont créés ou de leurs sites
CREATE POLICY "super_admin_can_update_all_surveys"
  ON surveys FOR UPDATE
  USING (
    public.is_super_admin() OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = surveys.site_id
      AND (
        sites.user_id = auth.uid() OR
        (sites.engineer_in_charge IS NOT NULL AND sites.engineer_in_charge = auth.uid()::text)
      )
    )
  )
  WITH CHECK (
    public.is_super_admin() OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = surveys.site_id
      AND (
        sites.user_id = auth.uid() OR
        (sites.engineer_in_charge IS NOT NULL AND sites.engineer_in_charge = auth.uid()::text)
      )
    )
  );

-- DELETE (Soft Delete) : Les super_admin peuvent soft delete tous les surveys, les user seulement ceux qu'ils ont créés
CREATE POLICY "super_admin_can_soft_delete_all_surveys"
  ON surveys FOR UPDATE
  USING (
    public.is_super_admin() OR
    auth.uid() = created_by
  )
  WITH CHECK (
    (public.is_super_admin() OR auth.uid() = created_by) AND
    deleted_at IS NOT NULL
  );

-- =================================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =================================================================
COMMENT ON FUNCTION public.is_super_admin() IS 'Vérifie si l''utilisateur actuel est un super_admin en vérifiant le rôle dans les user_metadata';

