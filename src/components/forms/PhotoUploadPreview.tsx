import { useState } from 'react';
import { Trash2, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import type { PhotoUploadProgress } from '../../hooks/useSurveyPhotos';
import { SafeSurveyImage } from './SafeSurveyImage';
import { isBlobUrl } from '@/lib/safePhotoUrl';

interface PhotoUploadPreviewProps {
  photoPreviews: string[];
  uploadProgress?: PhotoUploadProgress[];
  onDelete: (index: number) => void;
}

/**
 * Composant pour afficher les photos uploadées avec barre de progression
 * Inclut un lightbox mobile pour visualiser les photos en plein écran
 */
export function PhotoUploadPreview({ photoPreviews, uploadProgress = [], onDelete }: PhotoUploadPreviewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (photoPreviews.length === 0) return null;

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedImageIndex(null);
  };

  const handleDeleteFromLightbox = () => {
    if (selectedImageIndex !== null) {
      onDelete(selectedImageIndex);
      setSelectedImageIndex(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
        {photoPreviews.map((url, index) => {
          const progress = uploadProgress[index];
          const status = progress?.status || 'pending';
          const progressValue = progress?.progress || 0;

          return (
            <div key={index} className="relative group">
              <div 
                className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => handleImageClick(index)}
              >
                <SafeSurveyImage
                  src={url}
                  alt={`Prévisualisation ${index + 1}`}
                  className="h-24 w-full object-cover"
                  isLocallyCreated={isBlobUrl(url)}
                />
                
                {/* Overlay de progression */}
                {status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                    <div className="w-3/4 bg-surface-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                    <span className="text-xs text-white mt-1">{progressValue}%</span>
                  </div>
                )}

                {/* Indicateur de succès */}
                {status === 'success' && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                )}

                {/* Indicateur d'erreur */}
                {status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                )}
              </div>

              {/* Bouton de suppression */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={`Supprimer la photo ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Message d'erreur si présent */}
              {status === 'error' && progress?.error && (
                <p className="text-xs text-red-600 mt-1 truncate" title={progress.error}>
                  {progress.error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Mobile - Modale plein écran */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col md:hidden"
          onClick={handleCloseLightbox}
        >
          {/* Bouton Fermer en haut à droite */}
          <button
            type="button"
            onClick={handleCloseLightbox}
            className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image en plein écran */}
          <div className="flex-1 flex items-center justify-center p-4">
            <SafeSurveyImage
              src={photoPreviews[selectedImageIndex]}
              alt={`Photo ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              isLocallyCreated={isBlobUrl(photoPreviews[selectedImageIndex])}
            />
          </div>

          {/* Bouton Supprimer en bas au centre */}
          <div className="pb-8 flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFromLightbox();
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Supprimer la photo"
            >
              <Trash2 className="h-5 w-5" />
              <span className="font-medium">Supprimer</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
