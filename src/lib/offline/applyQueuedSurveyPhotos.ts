/**
 * Upload des blobs photos d'une entrée de queue et injection des URLs
 * publiques dans `specific_data` (étape 2 du rejeu).
 */

import { supabase } from '../supabase';
import { sanitizeSpecificData, uploadSurveyPhoto } from '../photos/surveyPhotoPipeline';
import {
  PendingSurveyEntry,
  getValueAtPath,
  loadPendingPhotoBlob,
  setValueAtPath,
} from './pendingSurveyQueue';

async function uploadPendingPhotoAndGetUrl(
  entry: PendingSurveyEntry,
  photoKey: string,
  mimeType: string,
  originalName: string,
  fieldPath: string
): Promise<string | null> {
  const blob = await loadPendingPhotoBlob(photoKey);
  if (!blob) return null;

  const cleanName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'photo.jpg';
  const file = new File([blob], cleanName, { type: mimeType || 'image/jpeg' });

  return uploadSurveyPhoto({
    file,
    siteId: entry.siteId,
    surveyType: entry.surveyType,
    fieldSuffix: fieldPath.split('.').pop() || 'photo',
    upsert: true,
  });
}

/**
 * Téléverse les photos encore en IndexedDB et met à jour la fiche serveur.
 * No-op si `entry.photos` est vide.
 */
export async function applyQueuedSurveyPhotos(entry: PendingSurveyEntry): Promise<void> {
  if (!entry.photos?.length) return;

  const updatedSpecificData: Record<string, unknown> = JSON.parse(
    JSON.stringify(entry.specificData ?? {})
  );

  for (const photo of entry.photos) {
    const publicUrl = await uploadPendingPhotoAndGetUrl(
      entry,
      photo.key,
      photo.mimeType,
      photo.originalName,
      photo.fieldPath
    );
    if (publicUrl) {
      setValueAtPath(updatedSpecificData, photo.fieldPath, publicUrl);
      continue;
    }

    const current = getValueAtPath(updatedSpecificData, photo.fieldPath);
    if (typeof current !== 'string' || current === '' || current.startsWith('blob:')) {
      setValueAtPath(updatedSpecificData, photo.fieldPath, '');
    }
  }

  const { error: linkError } = await supabase
    .from('surveys')
    .update({ specific_data: sanitizeSpecificData(updatedSpecificData) })
    .eq('id', entry.surveyId);
  if (linkError) throw linkError;
}
