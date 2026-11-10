/**
 * File d'attente des fiches en cours de synchronisation.
 *
 * - Les **métadonnées** (payload, photos à rejouer, etc.) sont stockées dans le
 *   `localStorage` sous la clé {@link QUEUE_STORAGE_KEY}.
 * - Les **blobs photos** sont stockés dans IndexedDB (cf. `indexedDbPhotos.ts`)
 *   et référencés par clé dans les entrées de la queue.
 *
 * Ces utilitaires sont volontairement agnostiques de React : ils sont utilisés
 * à la fois par le flux de soumission (`submitSurveyUpsert`) et par le moteur
 * de rejeu (`useSyncQueue` + `OfflineSyncManager`).
 */

import {
  deletePhotoBlob,
  putPhotoBlob,
  getPhotoBlob,
  listPhotoKeys,
  pruneOrphanPhotoBlobs,
  supportsIndexedDb,
} from './indexedDbPhotos';
import { sanitizeSpecificData } from '../photos/surveyPhotoPipeline';

export const QUEUE_STORAGE_KEY = 'pending_surveys_v1';
export const QUEUE_UPDATE_EVENT = 'pending-surveys:updated';
const MAX_QUEUE_STORAGE_BYTES = 4 * 1024 * 1024;
const MAX_QUEUE_WRITE_BYTES = 2 * 1024 * 1024;
/**
 * Délai de grâce avant purge d'un blob orphelin. Il laisse à l'outil de
 * réparation (`repairSurveyPhotos`) la possibilité de récupérer une photo dont
 * la fiche a déjà quitté la file d'attente.
 */
const ORPHAN_PHOTO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface QueuedPhoto {
  /** Clé IndexedDB où se trouve le blob associé. */
  key: string;
  /** Chemin de destination dans `specific_data` (ex: `photos.photo_sondage_url`). */
  fieldPath: string;
  originalName: string;
  mimeType: string;
}

export interface PendingSurveyEntry {
  surveyId: string;
  surveyType: string;
  siteId: string | null;
  createdBy: string | null;
  isEdit: boolean;
  specificData: Record<string, unknown>;
  name?: string | null;
  photos: QueuedPhoto[];
  createdAt: number;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: number;
}

/**
 * Payload prêt pour un upsert Supabase sur la table `surveys`.
 *
 * Dernière barrière avant la base : les URLs `blob:` sont retirées, y compris
 * pour les entrées mises en queue par une version antérieure de l'application.
 */
export function buildSurveyRow(entry: PendingSurveyEntry): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: entry.surveyId,
    site_id: entry.siteId,
    created_by: entry.createdBy,
    type: entry.surveyType,
    specific_data: sanitizeSpecificData(entry.specificData),
  };
  if (entry.name !== undefined && entry.name !== null) {
    row.name = entry.name;
  }
  return row;
}

function notifyUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(QUEUE_UPDATE_EVENT));
}

function readQueueRaw(): PendingSurveyEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingSurveyEntry[]) : [];
  } catch (err) {
    console.warn('[pendingSurveyQueue] queue illisible, reset', err);
    return [];
  }
}

function writeQueueRaw(entries: PendingSurveyEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } else {
      const serialized = JSON.stringify(entries);
      const serializedBytes = new TextEncoder().encode(serialized).length;
      if (serializedBytes > MAX_QUEUE_WRITE_BYTES) {
        console.error(
          `%c[pendingSurveyQueue] ALERTE: écriture annulée (${serializedBytes} bytes > ${MAX_QUEUE_WRITE_BYTES} bytes / 2 Mo).`,
          'color: #ff0000; font-weight: 700; background: #2b0000; padding: 2px 4px; border-radius: 2px;'
        );
        return;
      }
      if (serializedBytes > MAX_QUEUE_STORAGE_BYTES) {
        console.error(
          `[pendingSurveyQueue] écriture refusée: payload queue=${serializedBytes} bytes dépasse ${MAX_QUEUE_STORAGE_BYTES} bytes (4 Mo).`
        );
        return;
      }
      localStorage.setItem(QUEUE_STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.error('[pendingSurveyQueue] écriture impossible (quota ?)', err);
  }
}

export function clearCorruptedQueue(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    notifyUpdate();
  } catch (err) {
    console.error('[pendingSurveyQueue] suppression impossible de la queue corrompue', err);
  }
}

export function listPendingSurveys(): PendingSurveyEntry[] {
  return readQueueRaw();
}

export function findPendingSurvey(surveyId: string): PendingSurveyEntry | null {
  return readQueueRaw().find((e) => e.surveyId === surveyId) ?? null;
}

export function upsertPendingSurvey(entry: PendingSurveyEntry): void {
  const all = readQueueRaw();
  const idx = all.findIndex((e) => e.surveyId === entry.surveyId);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  writeQueueRaw(all);
  notifyUpdate();
}

export function removePendingSurvey(surveyId: string): void {
  const all = readQueueRaw();
  const filtered = all.filter((e) => e.surveyId !== surveyId);
  if (filtered.length !== all.length) {
    writeQueueRaw(filtered);
    notifyUpdate();
  }
}

export function updatePendingSurvey(
  surveyId: string,
  patch: Partial<PendingSurveyEntry>
): void {
  const all = readQueueRaw();
  const idx = all.findIndex((e) => e.surveyId === surveyId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  writeQueueRaw(all);
  notifyUpdate();
}

/**
 * Persiste une série de photos (Blob + chemin de destination) dans IndexedDB
 * et retourne les descripteurs à stocker dans la queue. Si IndexedDB est
 * indisponible, retourne un tableau vide : les photos seront perdues mais la
 * fiche (données structurées) restera sauvegardée.
 */
export async function storePendingPhotos(
  surveyId: string,
  photoInputs: Array<{ file: File; fieldPath: string }>
): Promise<QueuedPhoto[]> {
  if (!supportsIndexedDb() || photoInputs.length === 0) return [];

  const stored: QueuedPhoto[] = [];
  for (let i = 0; i < photoInputs.length; i++) {
    const { file, fieldPath } = photoInputs[i];
    const key = `${surveyId}::${Date.now()}::${i}::${file.name}`;
    try {
      await putPhotoBlob(key, file);
      stored.push({
        key,
        fieldPath,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
      });
    } catch (err) {
      console.error('[pendingSurveyQueue] persistance blob impossible', file.name, err);
    }
  }
  return stored;
}

export async function loadPendingPhotoBlob(key: string): Promise<Blob | null> {
  if (!supportsIndexedDb()) return null;
  return getPhotoBlob(key);
}

export async function cleanupPendingPhotos(photos: QueuedPhoto[]): Promise<void> {
  if (!supportsIndexedDb() || photos.length === 0) return;
  await Promise.all(photos.map((p) => deletePhotoBlob(p.key)));
}

/** Horodatage encodé dans la clé `{surveyId}::{timestamp}::{index}::{nom}`. */
function parsePhotoKeyTimestamp(key: string): number | null {
  const raw = key.split('::')[1];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Purge les blobs IndexedDB qui ne sont plus référencés par la file d'attente
 * et dont le délai de grâce est écoulé. Appelé au démarrage de l'app par
 * `OfflineSyncManager`.
 */
export async function pruneOrphanQueuePhotos(now = Date.now()): Promise<number> {
  if (!supportsIndexedDb()) return 0;

  const referenced = new Set<string>();
  for (const entry of readQueueRaw()) {
    for (const photo of entry.photos ?? []) referenced.add(photo.key);
  }

  // Les blobs récents sont préservés même sans référence : ils restent
  // récupérables par l'outil de réparation des photos.
  for (const key of await listPhotoKeys()) {
    const createdAt = parsePhotoKeyTimestamp(key);
    if (createdAt === null || now - createdAt < ORPHAN_PHOTO_TTL_MS) {
      referenced.add(key);
    }
  }

  return pruneOrphanPhotoBlobs(referenced);
}

/** Lit une valeur suivant un chemin en notation pointée (cf. {@link setValueAtPath}). */
export function getValueAtPath(target: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  let cursor: unknown = target;
  for (const part of path.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

/**
 * Positionne une valeur dans un objet suivant un chemin en notation pointée
 * supportant les indices numériques (ex: `observations.0.photo_lithologie_url`).
 * Crée les conteneurs intermédiaires si nécessaires.
 */
export function setValueAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) return;
  const parts = path.split('.');
  let cursor: any = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const nextIsArrayIndex = /^\d+$/.test(nextKey);
    if (cursor[key] === undefined || cursor[key] === null) {
      cursor[key] = nextIsArrayIndex ? [] : {};
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}
