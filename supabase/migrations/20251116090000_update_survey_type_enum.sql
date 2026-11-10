-- Migration pour s'assurer que le type ENUM survey_type contient bien toutes les valeurs attendues
-- et en particulier 'excavation', utilisée par l'application.

DO $$
BEGIN
  -- Ajoute la valeur 'excavation' si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'survey_type'
      AND e.enumlabel = 'excavation'
  ) THEN
    ALTER TYPE public.survey_type ADD VALUE 'excavation';
  END IF;
END
$$;




