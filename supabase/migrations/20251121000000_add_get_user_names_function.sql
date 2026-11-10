-- Fonction pour récupérer les noms des utilisateurs par leurs IDs
-- Cette fonction permet de récupérer les noms des utilisateurs depuis auth.users
-- pour les afficher dans l'interface sans exposer toute la table auth.users

CREATE OR REPLACE FUNCTION public.get_user_names(user_ids UUID[])
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
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Permettre l'exécution par les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_user_names(UUID[]) TO authenticated;

COMMENT ON FUNCTION public.get_user_names IS 'Récupère les noms complets des utilisateurs par leurs IDs pour l''affichage dans l''interface';










