/**
 * Hooks de gestion des champs photo unitaires des fiches (photo de sondage,
 * visualisation du point, photo de piézomètre, photo par observation).
 *
 * Ils centralisent le cycle de vie complet côté client :
 * - validation implicite déléguée au sélecteur (`PhotoPickerField`) ;
 * - compression avant toute conservation du binaire ;
 * - copie miroir dans la pellicule pour les clichés caméra ;
 * - prévisualisation `blob:` maintenue **hors** du state react-hook-form et
 *   systématiquement révoquée (remplacement, suppression, démontage).
 *
 * L'URL `blob:` ne quitte jamais ces hooks : les formulaires transmettent le
 * `File` à `submitSurveyUpsert` et persistent uniquement l'URL publique.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compressSurveyPhoto, resolveSurveyPhotoUrl } from '../lib/photos/surveyPhotoPipeline';
import { saveToCameraRollAsync } from '../lib/saveToCameraRoll';
import type { PhotoSource } from '../lib/photoSource';

function useObjectUrlRegistry() {
  const urlsRef = useRef<Set<string>>(new Set());

  const create = useCallback((file: File): string => {
    const url = URL.createObjectURL(file);
    urlsRef.current.add(url);
    return url;
  }, []);

  const revoke = useCallback((url: string | null | undefined) => {
    if (!url || !urlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  return { create, revoke };
}

async function prepareFile(file: File, source: PhotoSource): Promise<File> {
  // La pellicule reçoit le cliché original, avant dégradation par compression.
  saveToCameraRollAsync(file, source);
  return compressSurveyPhoto(file);
}

export interface SurveyPhotoField {
  /** Fichier sélectionné dans la session, en attente de téléversement. */
  file: File | null;
  /** Valeur à passer à `SafeSurveyImage.src` (blob local ou URL résolue). */
  previewUrl: string;
  /** Valeur à passer à `SafeSurveyImage.isLocallyCreated`. */
  isLocalPreview: boolean;
  /** `true` si un champ photo est renseigné (nouveau fichier ou URL existante). */
  hasPhoto: boolean;
  selectPhoto: (file: File, source: PhotoSource) => Promise<void>;
  clearPhoto: () => void;
  /** Injecte l'URL déjà persistée (chargement d'une fiche en édition). */
  setPersistedUrl: (url: string | null | undefined) => void;
  /** À appeler après téléversement réussi : le binaire n'est plus nécessaire. */
  markUploaded: (publicUrl: string) => void;
}

export function useSurveyPhotoField(initialPersistedUrl?: string | null): SurveyPhotoField {
  const { create, revoke } = useObjectUrlRegistry();
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [persistedUrl, setPersistedUrlState] = useState<string | null>(initialPersistedUrl ?? null);

  const selectPhoto = useCallback(
    async (nextFile: File, source: PhotoSource) => {
      const prepared = await prepareFile(nextFile, source);
      setObjectUrl((previous) => {
        revoke(previous);
        return create(prepared);
      });
      setFile(prepared);
    },
    [create, revoke]
  );

  const clearPhoto = useCallback(() => {
    setObjectUrl((previous) => {
      revoke(previous);
      return null;
    });
    setFile(null);
    setPersistedUrlState(null);
  }, [revoke]);

  const setPersistedUrl = useCallback((url: string | null | undefined) => {
    setPersistedUrlState(url ?? null);
  }, []);

  const markUploaded = useCallback(
    (publicUrl: string) => {
      setObjectUrl((previous) => {
        revoke(previous);
        return null;
      });
      setFile(null);
      setPersistedUrlState(publicUrl);
    },
    [revoke]
  );

  const resolvedPersistedUrl = useMemo(() => resolveSurveyPhotoUrl(persistedUrl) ?? '', [persistedUrl]);

  return {
    file,
    previewUrl: objectUrl ?? resolvedPersistedUrl,
    isLocalPreview: objectUrl !== null,
    hasPhoto: file !== null || resolvedPersistedUrl !== '',
    selectPhoto,
    clearPhoto,
    setPersistedUrl,
    markUploaded,
  };
}

export interface SurveyPhotoSlots {
  /** Fichiers en attente de téléversement, indexés (ex: index d'observation). */
  files: Map<number, File>;
  getPreviewUrl: (index: number) => string;
  isLocalPreview: (index: number) => boolean;
  selectPhoto: (index: number, file: File, source: PhotoSource) => Promise<void>;
  clearPhoto: (index: number) => void;
  /** Injecte les URLs déjà persistées (chargement d'une fiche en édition). */
  setPersistedUrls: (urls: Map<number, string> | Array<string | null | undefined>) => void;
  /** Descripteurs prêts pour `OfflinePhotoInput` / téléversement. */
  entries: () => Array<{ index: number; file: File }>;
  markUploaded: (index: number, publicUrl: string) => void;
}

/**
 * Variante multi-emplacements pour les photos répétées (une par observation de
 * lithologie, par exemple).
 */
export function useSurveyPhotoSlots(): SurveyPhotoSlots {
  const { create, revoke } = useObjectUrlRegistry();
  const [files, setFiles] = useState<Map<number, File>>(new Map());
  const [objectUrls, setObjectUrls] = useState<Map<number, string>>(new Map());
  const [persistedUrls, setPersistedUrlsState] = useState<Map<number, string>>(new Map());

  const selectPhoto = useCallback(
    async (index: number, nextFile: File, source: PhotoSource) => {
      const prepared = await prepareFile(nextFile, source);
      setObjectUrls((previous) => {
        revoke(previous.get(index));
        const next = new Map(previous);
        next.set(index, create(prepared));
        return next;
      });
      setFiles((previous) => {
        const next = new Map(previous);
        next.set(index, prepared);
        return next;
      });
    },
    [create, revoke]
  );

  const clearPhoto = useCallback(
    (index: number) => {
      setObjectUrls((previous) => {
        revoke(previous.get(index));
        const next = new Map(previous);
        next.delete(index);
        return next;
      });
      setFiles((previous) => {
        const next = new Map(previous);
        next.delete(index);
        return next;
      });
      setPersistedUrlsState((previous) => {
        const next = new Map(previous);
        next.delete(index);
        return next;
      });
    },
    [revoke]
  );

  const setPersistedUrls = useCallback(
    (urls: Map<number, string> | Array<string | null | undefined>) => {
      const next = new Map<number, string>();
      if (Array.isArray(urls)) {
        urls.forEach((url, index) => {
          if (url) next.set(index, url);
        });
      } else {
        urls.forEach((url, index) => {
          if (url) next.set(index, url);
        });
      }
      setPersistedUrlsState(next);
    },
    []
  );

  const markUploaded = useCallback(
    (index: number, publicUrl: string) => {
      setObjectUrls((previous) => {
        revoke(previous.get(index));
        const next = new Map(previous);
        next.delete(index);
        return next;
      });
      setFiles((previous) => {
        const next = new Map(previous);
        next.delete(index);
        return next;
      });
      setPersistedUrlsState((previous) => {
        const next = new Map(previous);
        next.set(index, publicUrl);
        return next;
      });
    },
    [revoke]
  );

  const getPreviewUrl = useCallback(
    (index: number) => {
      const local = objectUrls.get(index);
      if (local) return local;
      return resolveSurveyPhotoUrl(persistedUrls.get(index)) ?? '';
    },
    [objectUrls, persistedUrls]
  );

  const isLocalPreview = useCallback((index: number) => objectUrls.has(index), [objectUrls]);

  const entries = useCallback(
    () => Array.from(files.entries()).map(([index, file]) => ({ index, file })),
    [files]
  );

  return {
    files,
    getPreviewUrl,
    isLocalPreview,
    selectPhoto,
    clearPhoto,
    setPersistedUrls,
    entries,
    markUploaded,
  };
}
