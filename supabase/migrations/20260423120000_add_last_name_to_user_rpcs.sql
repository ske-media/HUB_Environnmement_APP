-- Ajout des champs `first_name` / `last_name` aux RPC `get_user_names` et
-- `get_all_users`, utilisées pour afficher « NOM Prénom » dans les listes.

-- Les colonnes `first_name`/`last_name` sont extraites de
-- `auth.users.raw_user_meta_data` où le formulaire de Signup les stocke.
-- Pour les comptes historiques (n'ayant que `full_name`), on fallback en
-- splittant le `full_name` sur le premier espace.

-- Le type de retour change (deux colonnes en plus) : PostgreSQL refuse un
-- simple CREATE OR REPLACE dans ce cas, il faut supprimer les fonctions avant
-- de les recréer. Les GRANT sont reposés en fin de fichier.
DROP FUNCTION IF EXISTS public.get_user_names(UUID[]);
DROP FUNCTION IF EXISTS public.get_all_users();

CREATE OR REPLACE FUNCTION public.get_user_names(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT
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
    )::TEXT AS full_name,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'first_name', ''),
      split_part(u.raw_user_meta_data->>'full_name', ' ', 1),
      ''
    )::TEXT AS first_name,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'last_name', ''),
      NULLIF(regexp_replace(u.raw_user_meta_data->>'full_name', '^\S+\s+', ''), u.raw_user_meta_data->>'full_name'),
      ''
    )::TEXT AS last_name
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

COMMENT ON FUNCTION public.get_user_names IS
  'Récupère les noms des utilisateurs (full_name, first_name, last_name) par leurs IDs.';

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT
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
    )::TEXT AS full_name,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'first_name', ''),
      split_part(u.raw_user_meta_data->>'full_name', ' ', 1),
      ''
    )::TEXT AS first_name,
    COALESCE(
      NULLIF(u.raw_user_meta_data->>'last_name', ''),
      NULLIF(regexp_replace(u.raw_user_meta_data->>'full_name', '^\S+\s+', ''), u.raw_user_meta_data->>'full_name'),
      ''
    )::TEXT AS last_name
  FROM auth.users u
  WHERE
    u.banned_until IS NULL
    AND (u.raw_user_meta_data->>'deletion_requested' IS NULL)
    AND (
      u.raw_user_meta_data->>'deletion_effective' IS NULL
      OR (u.raw_user_meta_data->>'deletion_effective')::timestamptz > NOW()
    )
  ORDER BY last_name NULLS LAST, first_name NULLS LAST, full_name;
END;
$$;

COMMENT ON FUNCTION public.get_all_users IS
  'Liste des utilisateurs actifs (hors bannis/supprimés) avec first_name/last_name.';

GRANT EXECUTE ON FUNCTION public.get_user_names(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
