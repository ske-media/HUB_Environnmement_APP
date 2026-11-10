-- Script de test pour vérifier que la fonction get_all_users() filtre correctement
-- les utilisateurs bannis ou supprimés

-- 1. Tester la fonction
SELECT * FROM public.get_all_users();

-- 2. Vérifier les utilisateurs bannis (ne devraient PAS apparaître)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  banned_until,
  raw_user_meta_data->>'deletion_requested' as deletion_requested,
  raw_user_meta_data->>'deletion_effective' as deletion_effective
FROM auth.users
WHERE banned_until IS NOT NULL
   OR raw_user_meta_data->>'deletion_requested' IS NOT NULL
   OR (raw_user_meta_data->>'deletion_effective' IS NOT NULL 
       AND (raw_user_meta_data->>'deletion_effective')::timestamptz <= NOW());

-- 3. Vérifier les utilisateurs actifs (devraient apparaître)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  banned_until,
  raw_user_meta_data->>'deletion_requested' as deletion_requested,
  raw_user_meta_data->>'deletion_effective' as deletion_effective
FROM auth.users
WHERE banned_until IS NULL
  AND (raw_user_meta_data->>'deletion_requested' IS NULL)
  AND (
    raw_user_meta_data->>'deletion_effective' IS NULL 
    OR (raw_user_meta_data->>'deletion_effective')::timestamptz > NOW()
  );
