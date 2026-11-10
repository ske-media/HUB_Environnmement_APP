/**
 * Utilitaires pour sécuriser l'affichage des URLs de photos de fiches.
 * Les URLs `blob:` persistées en base sont invalides après rechargement de page
 * et ne doivent ni être affichées ni servir de cible de navigation.
 */

export const STALE_BLOB_PLACEHOLDER_MESSAGE =
  'Photo non synchronisée sur ce serveur';

export function isBlobUrl(url: string | undefined | null): boolean {
  return typeof url === 'string' && url.startsWith('blob:');
}

/**
 * Une URL blob persistée (fiche historique) est considérée comme non récupérable
 * sauf si elle provient d'un fichier sélectionné dans la session courante.
 */
export function isStalePersistedBlobUrl(
  url: string | undefined | null,
  isLocallyCreated: boolean
): boolean {
  return isBlobUrl(url) && !isLocallyCreated;
}

export function shouldShowPhotoPlaceholder(
  url: string | undefined | null,
  isLocallyCreated: boolean,
  hasLoadError: boolean
): boolean {
  if (!url) return true;
  if (hasLoadError) return true;
  return isStalePersistedBlobUrl(url, isLocallyCreated);
}

/** Les URLs blob ne doivent jamais être utilisées comme href cliquable. */
export function isSafePhotoLinkHref(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  if (isBlobUrl(url)) return false;
  if (url.startsWith('javascript:')) return false;
  return /^https?:\/\//i.test(url) || url.startsWith('/');
}

/**
 * Détecte un chemin de stockage Supabase relatif (`sites/<id>/soil/xxx.jpg`),
 * format utilisé par les fiches enregistrées avant l'unification sur l'URL
 * publique. Ces valeurs restent lisibles via `getPublicUrl()`.
 */
export function isLegacyStoragePath(value: string | undefined | null): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('/')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;
  return /^[\w.-]+(\/[^/]+)+\.[a-z0-9]{2,5}$/i.test(trimmed);
}

export function parseSurveyIdFromPhotoKey(key: string): string | null {
  const surveyId = key.split('::')[0]?.trim();
  return surveyId || null;
}
