/**
 * Soumission d'une fiche, résistante à la perte de réseau.
 *
 * 1. Génère / accepte un ID client (crypto.randomUUID côté formulaire).
 * 2. Pose l'entrée en queue (localStorage + IndexedDB pour les photos) AVANT le
 *    moindre appel réseau, garantissant une survie en cas de crash / offline.
 * 3. Lance un `upsert` Supabase (`onConflict: 'id'` → anti-doublon) avec
 *    timeout 30 s et abandon propre via `AbortController`.
 * 4. Si succès → retire l'entrée de la queue. Sinon (timeout/offline/erreur
 *    réseau) → laisse l'entrée dans la queue pour replay ultérieur.
 */

import { supabase } from '../supabase';
import { sanitizeSpecificData } from '../photos/surveyPhotoPipeline';
import {
  PendingSurveyEntry,
  QueuedPhoto,
  buildSurveyRow,
  cleanupPendingPhotos,
  findPendingSurvey,
  removePendingSurvey,
  storePendingPhotos,
  updatePendingSurvey,
  upsertPendingSurvey,
} from './pendingSurveyQueue';
import { mergePendingSurveyEntry } from './pendingSurveyMerge';
import { applyQueuedSurveyPhotos } from './applyQueuedSurveyPhotos';

export const DEFAULT_SUBMIT_TIMEOUT_MS = 30_000;

export interface OfflinePhotoInput {
  file: File;
  /** Chemin à remplir dans `specific_data` lors du rejeu (ex: `photos.photo_sondage_url`). */
  fieldPath: string;
}

export interface SubmitSurveyUpsertOptions {
  surveyId: string;
  surveyType: string;
  siteId: string | null;
  createdBy: string | null;
  isEdit: boolean;
  specificData: Record<string, unknown>;
  name?: string | null;
  /**
   * Photos dont les blobs doivent être persistés en IndexedDB au cas où la
   * fiche bascule en queue (offline / timeout). En mode online, l'appelant
   * s'occupe généralement d'uploader les photos en amont et laisse ce tableau
   * vide.
   */
  photos?: OfflinePhotoInput[];
  timeoutMs?: number;
}

export interface SubmitSurveyUpsertResult {
  status: 'success' | 'pending';
  surveyId: string;
  /** Photos restées en IndexedDB en attente de rejeu. Vide si `status` vaut `success`. */
  queuedPhotos: QueuedPhoto[];
  error?: Error;
}

export function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false;
  const message = (err as Error).message ?? '';
  const name = (err as Error).name ?? '';
  if (name === 'AbortError') return true;
  const msgLower = message.toLowerCase();
  return (
    message === 'TIMEOUT' ||
    msgLower.includes('timeout') ||
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('network request failed') ||
    msgLower.includes('load failed') ||
    msgLower.includes('aborted')
  );
}

async function performUpsertWithTimeout(
  entry: PendingSurveyEntry,
  timeoutMs: number
): Promise<void> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  const row = buildSurveyRow(entry);

  const upsertPromise = (async () => {
    const { error } = await supabase
      .from('surveys')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single()
      .abortSignal(controller.signal);
    if (error) throw error;
  })();

  try {
    await Promise.race([upsertPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  }
}

export async function submitSurveyUpsert(
  opts: SubmitSurveyUpsertOptions
): Promise<SubmitSurveyUpsertResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS;

  const newQueuedPhotos: QueuedPhoto[] = opts.photos?.length
    ? await storePendingPhotos(opts.surveyId, opts.photos)
    : [];

  // Garde-fou structurel : aucune URL `blob:` ne doit atteindre la queue
  // `localStorage` ni la base. Le binaire correspondant vit en IndexedDB et
  // sera réinjecté sous forme d'URL publique par le rejeu.
  const specificData = sanitizeSpecificData(opts.specificData);

  const incoming: PendingSurveyEntry = {
    surveyId: opts.surveyId,
    surveyType: opts.surveyType,
    siteId: opts.siteId,
    createdBy: opts.createdBy,
    isEdit: opts.isEdit,
    specificData,
    name: opts.name ?? null,
    photos: newQueuedPhotos,
    createdAt: Date.now(),
    attempts: 0,
  };

  // Réouverture hors-ligne : on fusionne avec l'entrée déjà queued au lieu
  // de l'écraser (photos des champs non resoumis, createdAt d'origine).
  const { entry, photosToCleanup } = mergePendingSurveyEntry(
    findPendingSurvey(opts.surveyId),
    incoming
  );
  if (photosToCleanup.length > 0) {
    await cleanupPendingPhotos(photosToCleanup);
  }
  upsertPendingSurvey(entry);

  const queuedPhotos = entry.photos;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    updatePendingSurvey(opts.surveyId, {
      lastAttemptAt: Date.now(),
      lastError: 'offline',
    });
    return { status: 'pending', surveyId: opts.surveyId, queuedPhotos };
  }

  try {
    await performUpsertWithTimeout(entry, timeoutMs);
    if (queuedPhotos.length > 0) {
      await applyQueuedSurveyPhotos(entry);
    }
    // La fiche est passée : les blobs de secours n'ont plus d'utilité et
    // occuperaient inutilement le quota IndexedDB de l'appareil.
    await cleanupPendingPhotos(queuedPhotos);
    removePendingSurvey(opts.surveyId);
    return { status: 'success', surveyId: opts.surveyId, queuedPhotos: [] };
  } catch (err) {
    if (isLikelyNetworkError(err)) {
      updatePendingSurvey(opts.surveyId, {
        attempts: entry.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError: (err as Error).message,
      });
      return { status: 'pending', surveyId: opts.surveyId, queuedPhotos, error: err as Error };
    }
    // Erreur métier (RLS, validation, conflit de schéma…) : on vide la queue
    // pour éviter un rejeu en boucle d'une requête qui échouera toujours.
    await cleanupPendingPhotos(queuedPhotos);
    removePendingSurvey(opts.surveyId);
    throw err;
  }
}
