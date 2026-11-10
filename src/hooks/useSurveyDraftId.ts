import { useMemo } from 'react';

/**
 * Renvoie un `surveyId` stable pour le formulaire courant.
 *
 * - Mode édition : renvoie l'id déjà persisté (URL).
 * - Mode création : génère un UUID client via `crypto.randomUUID()` qui est
 *   utilisé par Supabase en `upsert(onConflict: 'id')` pour garantir
 *   l'idempotence de la soumission (anti-doublon sur double-clic / retry /
 *   reconnexion).
 */
export function useSurveyDraftId(existingSurveyId?: string): string {
  return useMemo(() => {
    if (existingSurveyId) return existingSurveyId;
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, [existingSurveyId]);
}
