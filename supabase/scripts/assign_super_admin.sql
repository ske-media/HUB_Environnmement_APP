-- Script pour assigner le rôle super_admin à un utilisateur
-- Usage : Remplacez 'VOTRE_EMAIL@example.com' par l'email de l'utilisateur à promouvoir

-- =================================================================
-- OPTION 1 : Assigner le rôle par email (Recommandé - Plus Simple)
-- =================================================================

-- Étape 1 : Voir l'utilisateur actuel (optionnel)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'role' as role_actuel,
  created_at
FROM auth.users 
WHERE email = 'VOTRE_EMAIL@example.com';

-- Étape 2 : Assigner le rôle super_admin directement par email
-- Remplacer 'VOTRE_EMAIL@example.com' par l'email réel
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'VOTRE_EMAIL@example.com';

-- Étape 3 : Vérifier que le rôle a été assigné
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'VOTRE_EMAIL@example.com';

-- =================================================================
-- OPTION 2 : Assigner le rôle par UUID (si vous avez l'UUID)
-- =================================================================

-- Si vous préférez utiliser l'UUID directement :
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"super_admin"'
-- )
-- WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
-- Remplacer '00000000-0000-0000-0000-000000000000' par le vrai UUID

-- =================================================================
-- OPTION 3 : Assigner le rôle à tous les utilisateurs existants (pour migration)
-- =================================================================
-- ATTENTION : cette option assigne super_admin à TOUS les utilisateurs
-- Utilisez uniquement si vous voulez que tous les utilisateurs existants soient admins

-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"super_admin"'
-- )
-- WHERE raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' = 'user';

-- =================================================================
-- OPTION 4 : Lister tous les utilisateurs et leurs rôles
-- =================================================================

SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- =================================================================
-- OPTION 5 : Retirer le rôle super_admin (rétrograder en user)
-- =================================================================

-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"user"'
-- )
-- WHERE email = 'VOTRE_EMAIL@example.com';
-- Remplacer 'VOTRE_EMAIL@example.com' par l'email réel

