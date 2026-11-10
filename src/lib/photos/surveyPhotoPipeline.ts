/**
 * Pipeline unique de gestion des photos de fiches.
 *
 * Tous les formulaires, le rejeu offline et la réparation passent par ce module
 * afin de garantir un comportement homogène :
 * - compression client avant tout stockage (mémoire, IndexedDB ou Supabase) ;
 * - chemin de stockage déterministe dans le bucket `survey-photos` ;
 * - une seule forme persistée dans `specific_data` : l'URL publique Supabase ;
 * - aucune URL `blob:` ne peut atteindre la base ni le `localStorage`.
 */

import imageCompression from 'browser-image-compression';
import { supabase } from '../supabase';
import { isBlobUrl, isLegacyStoragePath } from '../safePhotoUrl';

export const SURVEY_PHOTOS_BUCKET = 'survey-photos';

/** Aligné sur la limite de refus côté soumission (`useSurveySubmit`). */
export const PHOTO_TARGET_MAX_SIZE_MB = 1;

const COMPRESSION_OPTIONS = {
  maxSizeMB: PHOTO_TARGET_MAX_SIZE_MB,
  maxWidthOrHeight: 1600,
  initialQuality: 0.7,
  useWebWorker: true,
};

/**
 * Compresse une image côté client. Tolérant à l'échec : en cas d'erreur du
 * worker (formats HEIC exotiques, mémoire insuffisante), le fichier original
 * est retourné pour ne jamais bloquer la saisie terrain.
 */
export async function compressSurveyPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('[surveyPhotoPipeline] compression impossible, fichier original conservé', error);
    return file;
  }
}

function sanitizeExtension(file: Pick<File, 'name' | 'type'>): string {
  const rawExt = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const ext = rawExt?.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (ext && ext.length >= 2 && ext.length <= 5) return ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export interface SurveyPhotoPathOptions {
  siteId: string | null | undefined;
  surveyType: string;
  /** Suffixe lisible identifiant le champ (ex: `sondage`, `lithologie-2`). */
  fieldSuffix?: string;
  file: Pick<File, 'name' | 'type'>;
}

/**
 * Construit le chemin cible dans le bucket. Le schéma
 * `sites/{siteId}/{surveyType}/{timestamp}-{suffix}.{ext}` est celui utilisé
 * historiquement : il est conservé pour rester compatible avec les listings
 * existants (`useSites`).
 */
export function buildSurveyPhotoPath(options: SurveyPhotoPathOptions): string {
  const { siteId, surveyType, fieldSuffix = 'photo', file } = options;
  const safeSuffix = fieldSuffix.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'photo';
  const ext = sanitizeExtension(file);
  return `sites/${siteId ?? 'unknown'}/${surveyType}/${Date.now()}-${safeSuffix}.${ext}`;
}

export interface UploadSurveyPhotoOptions extends SurveyPhotoPathOptions {
  file: File;
  /** `true` lors d'un rejeu : évite un échec si le chemin existe déjà. */
  upsert?: boolean;
}

/**
 * Téléverse une photo et retourne son URL publique. C'est la seule fonction
 * autorisée à écrire dans le bucket : elle garantit que la valeur persistée
 * dans `specific_data` est toujours une URL publique exploitable.
 */
export async function uploadSurveyPhoto(options: UploadSurveyPhotoOptions): Promise<string> {
  const { file, upsert = false, ...pathOptions } = options;
  const filePath = buildSurveyPhotoPath({ ...pathOptions, file });

  const { error: uploadError } = await supabase.storage
    .from(SURVEY_PHOTOS_BUCKET)
    .upload(filePath, file, { upsert, contentType: file.type || 'image/jpeg' });

  if (uploadError) throw uploadError;

  const publicUrl = getSurveyPhotoPublicUrl(filePath);
  if (!publicUrl) throw new Error('URL publique indisponible après téléversement');
  return publicUrl;
}

export function getSurveyPhotoPublicUrl(storagePath: string): string | null {
  const { data } = supabase.storage.from(SURVEY_PHOTOS_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl ?? null;
}

/**
 * Normalise une valeur persistée en URL affichable.
 *
 * - URL publique / absolue : retournée telle quelle.
 * - Chemin de stockage relatif (fiches enregistrées avant l'unification du
 *   format) : résolu en URL publique.
 * - `blob:`, `data:` vide ou valeur absente : `null`, l'appelant affiche alors
 *   un placeholder plutôt qu'une image cassée.
 */
export function resolveSurveyPhotoUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isBlobUrl(trimmed)) return null;
  if (/^(https?:|data:)/i.test(trimmed)) return trimmed;
  if (isLegacyStoragePath(trimmed)) return getSurveyPhotoPublicUrl(trimmed);
  return null;
}

/**
 * Retire récursivement toute URL `blob:` d'une structure destinée à être
 * persistée (`specific_data`, file d'attente `localStorage`).
 *
 * Les URLs `blob:` sont liées au document courant : persistées, elles
 * deviennent des liens morts au premier rechargement. Le binaire, lui, est
 * conservé dans IndexedDB et réinjecté au rejeu par `replayPendingSurveys`.
 */
export function sanitizeSpecificData<T>(value: T): T {
  if (typeof value === 'string') {
    return (isBlobUrl(value) ? '' : value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSpecificData(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date || value instanceof Blob || value instanceof File) return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeSpecificData(item);
    }
    return result as unknown as T;
  }

  return value;
}

/** Indique si une structure contient encore au moins une URL `blob:`. */
export function containsBlobUrl(value: unknown): boolean {
  if (typeof value === 'string') return isBlobUrl(value);
  if (Array.isArray(value)) return value.some((item) => containsBlobUrl(item));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => containsBlobUrl(item));
  }
  return false;
}
