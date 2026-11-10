import { supabase } from '../supabase';
import { findPendingSurvey } from './pendingSurveyQueue';
import { pickLoadedSurveySpecificData } from './pendingSurveyMerge';

/**
 * Charge la fiche en privilégiant la file d'attente locale.
 *
 * Une entrée pending n'a pas encore été transmise : elle est plus récente
 * que `surveys.specific_data` sur le serveur. La prendre en second (ou
 * l'ignorer si le GET réussit) faisait écraser les mods hors-ligne à la
 * réouverture, puis à la sauvegarde suivante.
 */
export async function loadSurveySpecificDataWithOfflineFallback(
  surveyId: string
): Promise<Record<string, unknown> | null> {
  const pending = findPendingSurvey(surveyId);
  if (pending) {
    return pickLoadedSurveySpecificData(pending, null);
  }

  const { data, error } = await supabase
    .from('surveys')
    .select('specific_data')
    .eq('id', surveyId)
    .maybeSingle();

  if (!error && data?.specific_data) {
    return data.specific_data as Record<string, unknown>;
  }

  if (error) {
    throw error;
  }

  return null;
}
