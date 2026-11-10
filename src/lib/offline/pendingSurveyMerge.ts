/**
 * Fusion des versions locales d'une fiche en attente de sync.
 *
 * Module volontairement sans I/O : le chargement (pending vs serveur) et
 * l'upsert de queue s'appuient dessus, et le selftest peut l'exercer
 * sans localStorage / IndexedDB / Supabase.
 */

import type { PendingSurveyEntry, QueuedPhoto } from './pendingSurveyQueue';

/**
 * La version en file d'attente est toujours plus récente que le serveur
 * (elle n'a pas encore été transmise). On la choisit en priorité, même si
 * un GET Supabase réussit avec une copie périmée.
 */
export function pickLoadedSurveySpecificData(
  pending: { specificData?: Record<string, unknown> } | null,
  serverSpecificData: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (pending) {
    return (pending.specificData ?? {}) as Record<string, unknown>;
  }
  if (serverSpecificData) {
    return serverSpecificData;
  }
  return null;
}

export interface MergePendingSurveyResult {
  entry: PendingSurveyEntry;
  photosToCleanup: QueuedPhoto[];
}

/**
 * Combine une nouvelle sauvegarde avec l'entrée déjà en file pour le même
 * `surveyId`, au lieu de l'écraser.
 *
 * - `specificData` : la nouvelle version (formulaire rechargé depuis la
 *   pending, puis réédité) est la source de vérité.
 * - `photos` : les blobs déjà queued dont le `fieldPath` n'est pas remplacé
 *   par cette sauvegarde sont conservés. Un nouveau fichier sur le même
 *   chemin remplace l'ancien (l'appelant doit purger `photosToCleanup`).
 */
export function mergePendingSurveyEntry(
  existing: PendingSurveyEntry | null,
  incoming: PendingSurveyEntry
): MergePendingSurveyResult {
  if (!existing || existing.surveyId !== incoming.surveyId) {
    return { entry: incoming, photosToCleanup: [] };
  }

  const incomingPaths = new Set((incoming.photos ?? []).map((photo) => photo.fieldPath));
  const existingPhotos = existing.photos ?? [];
  const photosToCleanup = existingPhotos.filter((photo) => incomingPaths.has(photo.fieldPath));
  const keptExistingPhotos = existingPhotos.filter((photo) => !incomingPaths.has(photo.fieldPath));

  const entry: PendingSurveyEntry = {
    ...incoming,
    createdAt: existing.createdAt,
    isEdit: existing.isEdit || incoming.isEdit,
    siteId: incoming.siteId ?? existing.siteId,
    createdBy: incoming.createdBy ?? existing.createdBy,
    surveyType: incoming.surveyType || existing.surveyType,
    name:
      incoming.name !== undefined && incoming.name !== null ? incoming.name : existing.name,
    photos: [...keptExistingPhotos, ...(incoming.photos ?? [])],
  };

  return { entry, photosToCleanup };
}
