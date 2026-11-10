/**
 * Outil de diagnostic et réparation des photos de fiches dont l'URL persistée
 * est un lien `blob:` expiré, en récupérant le binaire depuis IndexedDB.
 *
 * Deux passes :
 * 1. Réparation : pour chaque blob encore présent en IndexedDB, téléversement
 *    puis réécriture du champ `blob:` correspondant avec l'URL publique.
 * 2. Nettoyage : les champs `blob:` restants, définitivement irrécupérables,
 *    sont vidés pour que l'interface affiche un placeholder explicite plutôt
 *    qu'une image cassée.
 */

import { supabase } from '../supabase';
import {
  deletePhotoBlob,
  getPhotoBlob,
  listPhotoKeys,
} from './indexedDbPhotos';
import { findPendingSurvey, listPendingSurveys } from './pendingSurveyQueue';
import { isBlobUrl, parseSurveyIdFromPhotoKey } from '../safePhotoUrl';
import { uploadSurveyPhoto } from '../photos/surveyPhotoPipeline';

export interface PhotoRepairResult {
  scannedKeys: number;
  repaired: number;
  cleaned: number;
  skipped: number;
  errors: string[];
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(
  data: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const parts = path.split('.');
  let current: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (next == null || typeof next !== 'object') {
      current[part] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return clone;
}

function collectBlobPhotoFields(
  specificData: Record<string, unknown>,
  prefix = ''
): Array<{ fieldPath: string; url: string }> {
  const results: Array<{ fieldPath: string; url: string }> = [];

  for (const [key, value] of Object.entries(specificData)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' && isBlobUrl(value)) {
      results.push({ fieldPath, url: value });
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && isBlobUrl(item)) {
          results.push({ fieldPath: `${fieldPath}.${index}`, url: item });
          return;
        }
        if (item && typeof item === 'object') {
          results.push(
            ...collectBlobPhotoFields(item as Record<string, unknown>, `${fieldPath}.${index}`)
          );
        }
      });
      continue;
    }

    if (value && typeof value === 'object') {
      results.push(...collectBlobPhotoFields(value as Record<string, unknown>, fieldPath));
    }
  }

  return results;
}

/**
 * Détermine le champ à réparer pour un blob local.
 *
 * La file d'attente est la source de vérité quand elle référence encore la
 * clé. À défaut (fiche déjà sortie de la queue), on apparie le blob au premier
 * champ `blob:` non encore traité de la fiche : deviner un nom de champ
 * conduirait à écrire la photo au mauvais endroit.
 */
function resolveFieldPathForKey(
  surveyId: string,
  key: string,
  remainingBlobFields: string[]
): string | null {
  const pending = findPendingSurvey(surveyId);
  const queuedPhoto = pending?.photos.find((photo) => photo.key === key);
  if (queuedPhoto?.fieldPath && remainingBlobFields.includes(queuedPhoto.fieldPath)) {
    return queuedPhoto.fieldPath;
  }
  return remainingBlobFields[0] ?? null;
}

async function repairSurveyField(
  surveyId: string,
  siteId: string,
  surveyType: string,
  specificData: Record<string, unknown>,
  fieldPath: string,
  blob: Blob,
  originalName?: string
): Promise<Record<string, unknown>> {
  const fieldSuffix = fieldPath.split('.').pop() || 'photo';
  const fileName = originalName || `${fieldSuffix}.jpg`;
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

  const publicUrl = await uploadSurveyPhoto({
    file,
    siteId,
    surveyType,
    fieldSuffix,
  });

  const updatedData = setNestedValue(specificData, fieldPath, publicUrl);

  const { error } = await supabase
    .from('surveys')
    .update({ specific_data: updatedData })
    .eq('id', surveyId);

  if (error) throw error;
  return updatedData;
}

/**
 * Analyse IndexedDB et répare les fiches dont les photos blob expirées
 * peuvent encore être récupérées localement.
 */
export async function repairLocalSurveyPhotos(): Promise<PhotoRepairResult> {
  const result: PhotoRepairResult = {
    scannedKeys: 0,
    repaired: 0,
    cleaned: 0,
    skipped: 0,
    errors: [],
  };

  const keys = await listPhotoKeys();
  result.scannedKeys = keys.length;

  const keysBySurvey = new Map<string, string[]>();
  for (const key of keys) {
    const surveyId = parseSurveyIdFromPhotoKey(key);
    if (!surveyId) continue;
    const group = keysBySurvey.get(surveyId) ?? [];
    group.push(key);
    keysBySurvey.set(surveyId, group);
  }

  // Fiches dont l'état local reste incertain : elles sont exclues de la passe
  // de nettoyage pour ne pas détruire une photo encore récupérable.
  const surveysToSkipCleanup = new Set<string>();

  for (const [surveyId, surveyKeys] of keysBySurvey) {
    try {
      const { data: survey, error } = await supabase
        .from('surveys')
        .select('id, site_id, type, specific_data')
        .eq('id', surveyId)
        .maybeSingle();

      if (error) throw error;
      if (!survey?.site_id || !survey.specific_data) {
        result.skipped += surveyKeys.length;
        continue;
      }

      let specificData = survey.specific_data as Record<string, unknown>;
      const remainingBlobFields = collectBlobPhotoFields(specificData).map((f) => f.fieldPath);
      if (remainingBlobFields.length === 0) {
        result.skipped += surveyKeys.length;
        continue;
      }

      for (const key of surveyKeys) {
        const fieldPath = resolveFieldPathForKey(surveyId, key, remainingBlobFields);
        if (!fieldPath) {
          result.skipped++;
          continue;
        }

        const currentValue = getNestedValue(specificData, fieldPath);
        if (typeof currentValue !== 'string' || !isBlobUrl(currentValue)) {
          result.skipped++;
          continue;
        }

        const blob = await getPhotoBlob(key);
        if (!blob) {
          result.skipped++;
          continue;
        }

        const pending = findPendingSurvey(surveyId);
        const queuedPhoto = pending?.photos.find((photo) => photo.key === key);

        specificData = await repairSurveyField(
          surveyId,
          survey.site_id,
          survey.type,
          specificData,
          fieldPath,
          blob,
          queuedPhoto?.originalName
        );

        await deletePhotoBlob(key);
        remainingBlobFields.splice(remainingBlobFields.indexOf(fieldPath), 1);
        result.repaired++;
      }
    } catch (err) {
      // Échec partiel : on ne nettoiera pas cette fiche, une nouvelle tentative
      // reste possible tant que le binaire est en IndexedDB.
      surveysToSkipCleanup.add(surveyId);
      result.errors.push(
        `Fiche ${surveyId} : ${err instanceof Error ? err.message : 'erreur inconnue'}`
      );
    }
  }

  // Passe 2 : nettoyage des liens blob morts sans binaire local exploitable.
  const remainingLocalSurveyIds = new Set<string>();
  for (const key of await listPhotoKeys()) {
    const surveyId = parseSurveyIdFromPhotoKey(key);
    if (surveyId) remainingLocalSurveyIds.add(surveyId);
  }

  const surveyIdsToInspect = new Set<string>([
    ...keysBySurvey.keys(),
    ...listPendingSurveys().map((entry) => entry.surveyId),
  ]);

  // Les fiches Gaz sont historiquement les plus touchées (URL blob écrite
  // directement dans le formulaire avant l'unification du pipeline).
  const { data: gasSurveys, error: gasQueryError } = await supabase
    .from('surveys')
    .select('id')
    .eq('type', 'gas');

  if (gasQueryError) {
    result.errors.push(`Requête fiches gaz : ${gasQueryError.message}`);
  } else {
    for (const survey of gasSurveys ?? []) {
      surveyIdsToInspect.add(survey.id);
    }
  }

  for (const surveyId of surveyIdsToInspect) {
    if (surveysToSkipCleanup.has(surveyId)) continue;

    try {
      const { data: survey, error } = await supabase
        .from('surveys')
        .select('id, specific_data')
        .eq('id', surveyId)
        .maybeSingle();

      if (error) throw error;
      if (!survey?.specific_data) continue;

      let specificData = survey.specific_data as Record<string, unknown>;
      const blobFields = collectBlobPhotoFields(specificData);
      if (blobFields.length === 0) continue;

      // Un binaire local subsiste pour cette fiche : la réparation pourra
      // aboutir plus tard (ex. téléversement en échec faute de réseau).
      if (remainingLocalSurveyIds.has(surveyId)) {
        result.skipped += blobFields.length;
        continue;
      }

      for (const { fieldPath } of blobFields) {
        specificData = setNestedValue(specificData, fieldPath, '');
        result.cleaned++;
      }

      const { error: updateError } = await supabase
        .from('surveys')
        .update({ specific_data: specificData })
        .eq('id', surveyId);
      if (updateError) throw updateError;
    } catch (err) {
      result.errors.push(
        `Nettoyage ${surveyId} : ${err instanceof Error ? err.message : 'erreur inconnue'}`
      );
    }
  }

  return result;
}
