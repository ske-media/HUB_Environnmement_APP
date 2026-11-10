import { useCallback, useId, useRef } from 'react';
import { validateUploadedFile } from '@/lib/utils';
import { useToast } from '../../contexts/ToastContext';
import {
  isNativeCameraAvailable,
  tryCapturePhotoNative,
  tryPickPhotoFromGalleryNative,
} from '../../lib/nativeCamera';
import type { PhotoSource } from '../../lib/photoSource';
import { PHOTO_SOURCE_INPUT_ATTR } from '../../lib/photoSource';
import { PhotoPickerActions } from './PhotoPickerActions';

export type PhotoPickerHandler = (file: File, source: PhotoSource) => void;

interface PhotoPickerFieldProps {
  label: string;
  onPhotoSelected: PhotoPickerHandler;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Sélecteur compact pour un champ photo unique (formulaires inline).
 */
export function PhotoPickerField({
  label,
  onPhotoSelected,
  id,
  className,
  children,
}: PhotoPickerFieldProps) {
  const autoId = useId();
  const baseId = id ?? `photo-picker-${autoId}`;
  const { showToast } = useToast();

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const inputRefs: Record<PhotoSource, React.RefObject<HTMLInputElement>> = {
    camera: cameraRef,
    gallery: galleryRef,
    files: filesRef,
  };

  const openPicker = useCallback(
    async (source: PhotoSource) => {
      // En natif, caméra et galerie passent par le plugin Capacitor :
      // l'`input[type=file]` de la WebView échoue sans message sur Android 13+.
      if (isNativeCameraAvailable() && (source === 'camera' || source === 'gallery')) {
        const isCamera = source === 'camera';
        try {
          const file = isCamera
            ? await tryCapturePhotoNative()
            : await tryPickPhotoFromGalleryNative();
          if (!file) return;

          const validation = validateUploadedFile(file, { maxSizeMB: 10 });
          if (!validation.isValid) {
            showToast('error', validation.error || 'Fichier invalide');
            return;
          }

          onPhotoSelected(file, source);
        } catch (error) {
          showToast(
            'error',
            error instanceof Error
              ? error.message
              : isCamera
                ? "Impossible d'accéder à l'appareil photo."
                : "Impossible d'accéder à la galerie."
          );
        }
        return;
      }

      inputRefs[source].current?.click();
    },
    [onPhotoSelected, showToast]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, source: PhotoSource) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const validation = validateUploadedFile(file, { maxSizeMB: 10 });
      if (!validation.isValid) {
        showToast('error', validation.error || 'Fichier invalide');
        event.target.value = '';
        return;
      }

      onPhotoSelected(file, source);
      event.target.value = '';
    },
    [onPhotoSelected, showToast]
  );

  return (
    <div className={className}>
      <p className="block text-sm font-medium text-foreground dark:text-white mb-2">{label}</p>

      <PhotoPickerActions variant="compact" onOpenSource={openPicker} />

      {(Object.keys(inputRefs) as PhotoSource[])
        .filter((source) => source === 'files' || !isNativeCameraAvailable())
        .map((source) => {
        const attrs = PHOTO_SOURCE_INPUT_ATTR[source];
        return (
          <input
            key={source}
            ref={inputRefs[source]}
            id={`${baseId}-${source}`}
            type="file"
            accept={attrs.accept}
            capture={attrs.capture}
            onChange={(event) => handleChange(event, source)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        );
      })}

      {children}
    </div>
  );
}
