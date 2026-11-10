import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { validateUploadedFile } from '../lib/utils';
import imageCompression from 'browser-image-compression';
import type { PhotoSource } from '../lib/photoSource';
import { saveCameraPhotosToCameraRoll } from '../lib/saveToCameraRoll';

interface UseSurveyPhotosOptions {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
}

export interface PhotoUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

/**
 * Hook personnalisé pour gérer les photos dans les formulaires de fiche
 * Gère la validation, la prévisualisation, l'upload et la suppression
 */
export function useSurveyPhotos(options: UseSurveyPhotosOptions = {}) {
  const { maxSizeMB = 10, allowedMimeTypes } = options;
  const { showToast } = useToast();
  
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress[]>([]);

  const compressImageFile = useCallback(async (file: File): Promise<File> => {
    // Ignore les fichiers non images.
    if (!file.type.startsWith('image/')) return file;

    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1200,
        initialQuality: 0.7,
        useWebWorker: true,
      });

      return new File([compressed], file.name, {
        type: compressed.type || file.type,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.warn('[useSurveyPhotos] Compression image impossible, fallback fichier original:', error);
      return file;
    }
  }, []);

  /**
   * Valide et ajoute des fichiers photos
   */
  const handlePhotoUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: PhotoSource = 'gallery'
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    
    // Valider chaque fichier avant de l'ajouter
    for (const file of newFiles) {
      const validation = validateUploadedFile(file, { maxSizeMB, allowedMimeTypes });
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        showToast('error', validation.error || 'Fichier invalide');
      }
    }
    
    if (validFiles.length > 0) {
      saveCameraPhotosToCameraRoll(validFiles, source);

      const compressedFiles = await Promise.all(validFiles.map((file) => compressImageFile(file)));
      setPhotoFiles(prev => [...prev, ...compressedFiles]);
      const newUrls = compressedFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newUrls]);
      
      // Initialiser le suivi de progression pour les nouveaux fichiers
      setUploadProgress(prev => [
        ...prev,
        ...compressedFiles.map(file => ({
          file,
          progress: 0,
          status: 'pending' as const,
        })),
      ]);
    }
  }, [maxSizeMB, allowedMimeTypes, showToast, compressImageFile]);

  /**
   * Supprime une photo par son index
   */
  const handleDeletePhoto = useCallback((index: number) => {
    // Révoquer l'URL de prévisualisation pour libérer la mémoire
    URL.revokeObjectURL(photoPreviews[index]);
    
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  }, [photoPreviews]);

  /**
   * Réinitialise toutes les photos
   */
  const clearPhotos = useCallback(() => {
    // Révoquer toutes les URLs de prévisualisation
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setUploadProgress([]);
  }, [photoPreviews]);

  /**
   * Met à jour la progression d'upload d'un fichier
   */
  const updateUploadProgress = useCallback((fileIndex: number, progress: number, status: PhotoUploadProgress['status'], error?: string, url?: string) => {
    setUploadProgress(prev => {
      const updated = [...prev];
      if (updated[fileIndex]) {
        updated[fileIndex] = {
          ...updated[fileIndex],
          progress,
          status,
          error,
          url,
        };
      }
      return updated;
    });
  }, []);

  return {
    photoFiles,
    photoPreviews,
    uploadProgress,
    handlePhotoUpload,
    handleDeletePhoto,
    clearPhotos,
    updateUploadProgress,
  };
}
