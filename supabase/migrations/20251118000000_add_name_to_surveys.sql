-- =================================================================
--  Migration : Ajout du champ 'name' à la table surveys
-- =================================================================
--  Cette migration ajoute la colonne 'name' (nom personnalisé)
--  à la table surveys pour permettre de nommer individuellement
--  chaque fiche au lieu d'utiliser uniquement le type.
-- =================================================================

-- =================================================================
--  1. AJOUT DE LA COLONNE name
-- =================================================================

ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.surveys.name IS 'Nom personnalisé de la fiche. Si NULL, le nom par défaut basé sur le type sera utilisé.';

-- =================================================================
--  2. MISE À JOUR DES FICHES EXISTANTES (OPTIONNEL)
-- =================================================================
-- Les fiches existantes auront name = NULL, ce qui permettra
-- d'utiliser le nom par défaut basé sur le type.

-- =================================================================
--                   FIN DE LA MIGRATION
-- =================================================================

