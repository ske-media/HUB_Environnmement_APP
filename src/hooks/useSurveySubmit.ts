import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UseFormHandleSubmit, FieldValues } from 'react-hook-form';
import { uploadSurveyPhoto } from '../lib/photos/surveyPhotoPipeline';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  OfflinePhotoInput,
  submitSurveyUpsert,
  isLikelyNetworkError,
} from '../lib/offline/submitSurveyUpsert';
import { setValueAtPath } from '../lib/offline/pendingSurveyQueue';

const MAX_PHOTO_UPLOAD_BYTES = 1 * 1024 * 1024; // 1 Mo

interface UseSurveySubmitOptions<T extends FieldValues> {
  surveyType: string;
  handleSubmit: UseFormHandleSubmit<T>;
  photoFiles?: File[];
  onSuccess?: (surveyId: string, meta?: { optimistic: boolean }) => void;
  isEditMode?: boolean;
  surveyId?: string;
  /**
   * ID stable du brouillon (facultatif). Si omis, un `crypto.randomUUID()` est
   * généré au premier appel et mémoïsé pour garantir l'idempotence entre les
   * retries (anti-doublon côté serveur via `upsert onConflict: 'id'`).
   */
  draftId?: string;
  /** Chemin dans `specific_data` pour l'injection des URLs de photos lors du rejeu. */
  photoFieldPath?: string;
}

/**
 * Hook de soumission pour les formulaires utilisant directement le flux
 * générique (upload photos + `survey.specific_data = formValues`).
 *
 * Déroulé :
 * - Génère un `surveyId` côté client (stable via `useMemo`).
 * - Tente d'uploader les photos en ligne, avec fallback en queue si réseau KO.
 * - Appelle `submitSurveyUpsert` qui pose l'entrée en queue avant le réseau
 *   puis rejoue automatiquement au retour en ligne.
 * - Toast orange persistant en cas de bascule offline, vert en cas de succès.
 */
export function useSurveySubmit<T extends FieldValues>(options: UseSurveySubmitOptions<T>) {
  const {
    surveyType,
    handleSubmit,
    photoFiles = [],
    onSuccess,
    isEditMode = false,
    surveyId,
    draftId,
    photoFieldPath = 'photos',
  } = options;

  const navigate = useNavigate();
  const { siteId } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const effectiveSurveyId = useMemo(() => {
    return surveyId ?? draftId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  }, [surveyId, draftId]);

  /**
   * Téléverse les photos et retourne leurs URLs publiques. Le format est
   * identique à celui produit par le rejeu offline, ce qui garantit une valeur
   * unique et directement affichable dans `specific_data`.
   */
  const uploadPhotos = useCallback(async (): Promise<string[]> => {
    if (photoFiles.length === 0) return [];
    const uploadedPhotoUrls: string[] = [];

    for (const [index, file] of photoFiles.entries()) {
      uploadedPhotoUrls.push(
        await uploadSurveyPhoto({
          file,
          siteId: siteId ?? null,
          surveyType,
          fieldSuffix: `photo-${index}`,
        })
      );
    }

    return uploadedPhotoUrls;
  }, [photoFiles, siteId, surveyType]);

  const onSubmit = useCallback(async (formValues: T) => {
    setLoading(true);
    setError('');

    const pendingPhotos: OfflinePhotoInput[] = [];
    let uploadedPhotoUrls: string[] = [];

    try {
      const oversizedPhotos = photoFiles.filter((file) => file.size > MAX_PHOTO_UPLOAD_BYTES);
      if (oversizedPhotos.length > 0) {
        const names = oversizedPhotos.map((file) => file.name).join(', ');
        throw new Error(
          `Images trop lourdes après compression (> 1 Mo) : ${names}. Réduisez la résolution puis réessayez.`
        );
      }

      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (isOffline) {
        photoFiles.forEach((file, index) => {
          pendingPhotos.push({ file, fieldPath: `${photoFieldPath}.${index}` });
        });
      } else {
        try {
          uploadedPhotoUrls = await uploadPhotos();
        } catch (photoErr) {
          if (isLikelyNetworkError(photoErr)) {
            photoFiles.forEach((file, index) => {
              pendingPhotos.push({ file, fieldPath: `${photoFieldPath}.${index}` });
            });
          } else {
            throw photoErr;
          }
        }
      }

      const specificData: Record<string, unknown> = { ...(formValues as Record<string, unknown>) };

      // Les URLs sont écrites au chemin déclaré, celui-là même que le rejeu
      // utilisera : online et offline aboutissent à la même structure.
      uploadedPhotoUrls.forEach((url, index) => {
        setValueAtPath(specificData, `${photoFieldPath}.${index}`, url);
      });
      pendingPhotos.forEach((_, index) => {
        setValueAtPath(specificData, `${photoFieldPath}.${index}`, '');
      });

      const result = await submitSurveyUpsert({
        surveyId: effectiveSurveyId,
        surveyType,
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData,
        photos: pendingPhotos,
      });

      if (result.status === 'pending') {
        showToast(
          'warning',
          'Connexion perdue. Fiche sauvegardée localement. Synchronisation automatique au retour du réseau.',
          0,
          'offline-pending'
        );
        if (onSuccess) onSuccess(effectiveSurveyId, { optimistic: true });
        else navigate(`/sites/${siteId}`);
        return;
      }

      showToast('success', isEditMode ? 'Fiche mise à jour avec succès' : 'Fiche créée avec succès');
      if (onSuccess) onSuccess(effectiveSurveyId, { optimistic: false });
      else navigate(`/sites/${siteId}`);
    } catch (err) {
      const errorMessage = (err as Error)?.message || "Une erreur est survenue lors de l'enregistrement.";
      console.error('[useSurveySubmit] error', err);
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    surveyType,
    siteId,
    user?.id,
    photoFiles,
    uploadPhotos,
    isEditMode,
    effectiveSurveyId,
    photoFieldPath,
    onSuccess,
    navigate,
    showToast,
  ]);

  const submitForm = handleSubmit(onSubmit);

  return {
    submitForm,
    loading,
    error,
    setError,
    surveyId: effectiveSurveyId,
  };
}
