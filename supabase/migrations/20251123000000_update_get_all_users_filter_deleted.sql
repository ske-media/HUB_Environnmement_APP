-- Migration : Mise à jour de la fonction get_all_users pour exclure les utilisateurs supprimés/bannis
-- Date : 2025-11-23
-- 
-- Cette migration met à jour la fonction get_all_users() pour filtrer :
-- - Les utilisateurs bannis (banned_until IS NOT NULL)
-- - Les utilisateurs avec une demande de suppression (deletion_requested dans metadata)

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(
      u.raw_user_meta_data->>'full_name', 
      u.email,
      'Utilisateur inconnu'
    )::TEXT as full_name
  FROM auth.users u
  WHERE 
    -- Exclure les utilisateurs bannis (bannis temporairement ou définitivement)
    u.banned_until IS NULL
    -- Exclure les utilisateurs avec une demande de suppression
    AND (u.raw_user_meta_data->>'deletion_requested' IS NULL)
    -- Exclure les utilisateurs dont la suppression est effective
    AND (
      u.raw_user_meta_data->>'deletion_effective' IS NULL 
      OR (u.raw_user_meta_data->>'deletion_effective')::timestamptz > NOW()
    )
  ORDER BY full_name;
END;
$$;

-- Mettre à jour le commentaire
COMMENT ON FUNCTION public.get_all_users IS 'Récupère tous les utilisateurs actifs de la base de données (exclut les utilisateurs bannis ou supprimés) pour l''affichage dans les listes de préleveurs';
