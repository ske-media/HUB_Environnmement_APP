/**
 * Moteur de rejeu des fiches en attente (retour en ligne / mount de l'app).
 *
 * Pour chaque entrée :
 * 1. Upsert de la fiche (`surveys`) avec l'ID client pour garantir
 *    l'idempotence (anti-doublon).
 * 2. Upload des blobs photos encore persistés en IndexedDB.
 * 3. Injection des URLs publiques dans `specific_data` au chemin déclaré.
 * 4. Nettoyage (suppression des blobs + retrait de la queue).
 */

import { supabase } from '../supabase';
import {
  PendingSurveyEntry,
  buildSurveyRow,
  cleanupPendingPhotos,
  listPendingSurveys,
  removePendingSurvey,
  updatePendingSurvey,
} from './pendingSurveyQueue';
import { applyQueuedSurveyPhotos } from './applyQueuedSurveyPhotos';
import { isLikelyNetworkError } from './submitSurveyUpsert';

export interface ReplayResult {
  attempted: number;
  succeeded: number;
  failed: number;
  stillPending: number;
}

function buildResult(
  attempted: number,
  succeeded: number,
  failed: number
): ReplayResult {
  return {
    attempted,
    succeeded,
    failed,
    stillPending: listPendingSurveys().length,
  };
}

async function replaySingleEntry(entry: PendingSurveyEntry): Promise<void> {
  // Étape 1 : upsert idempotent
  const row = buildSurveyRow(entry);
  const { error: upsertError } = await supabase
    .from('surveys')
    .upsert(row, { onConflict: 'id' })
    .select('id')
    .single();
  if (upsertError) throw upsertError;

  // Étape 2 : upload des photos en attente, si présentes
  await applyQueuedSurveyPhotos(entry);

  // Étape 3 : nettoyage
  await cleanupPendingPhotos(entry.photos);
  removePendingSurvey(entry.surveyId);
}

async function replayEntries(entries: PendingSurveyEntry[]): Promise<ReplayResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      stillPending: listPendingSurveys().length,
    };
  }

  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await replaySingleEntry(entry);
      succeeded++;
    } catch (err) {
      console.error('[replayPendingSurveys] échec fiche', entry.surveyId, err);
      if (isLikelyNetworkError(err)) {
        updatePendingSurvey(entry.surveyId, {
          attempts: (entry.attempts ?? 0) + 1,
          lastAttemptAt: Date.now(),
          lastError: (err as Error).message,
        });
      } else {
        // Erreur métier (RLS / schéma) : on drop pour ne pas boucler.
        await cleanupPendingPhotos(entry.photos);
        removePendingSurvey(entry.surveyId);
      }
      failed++;
    }
  }

  return buildResult(entries.length, succeeded, failed);
}

export async function replayPendingSurveys(): Promise<ReplayResult> {
  return replayEntries(listPendingSurveys());
}

export async function replayPendingSurveyById(surveyId: string): Promise<ReplayResult> {
  const entry = listPendingSurveys().find((item) => item.surveyId === surveyId);
  if (!entry) {
    return buildResult(0, 0, 0);
  }
  return replayEntries([entry]);
}
