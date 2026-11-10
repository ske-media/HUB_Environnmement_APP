-- Fonction pour récupérer tous les utilisateurs de la base de données
-- Cette fonction permet de récupérer tous les utilisateurs depuis auth.users
-- pour les afficher dans les listes déroulantes de préleveurs

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
  ORDER BY full_name;
END;
$$;

-- Permettre l'exécution par les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

COMMENT ON FUNCTION public.get_all_users IS 'Récupère tous les utilisateurs de la base de données pour l''affichage dans les listes de préleveurs';
