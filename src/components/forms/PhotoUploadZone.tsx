import { useCallback, useId, useRef } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { useToast } from '../../contexts/ToastContext';
import {
  isNativeCameraAvailable,
  tryCapturePhotoNative,
  tryPickPhotoFromGalleryNative,
} from '../../lib/nativeCamera';
import type { PhotoSource } from '../../lib/photoSource';
import { PHOTO_SOURCE_INPUT_ATTR } from '../../lib/photoSource';
import { PhotoPickerActions } from './PhotoPickerActions';

export type PhotoUploadHandler = (
  event: React.ChangeEvent<HTMLInputElement>,
  source: PhotoSource
) => void;

interface PhotoUploadZoneProps {
  onPhotoUpload: PhotoUploadHandler;
  id?: string;
  multiple?: boolean;
  className?: string;
}

function HiddenPhotoInput({
  id,
  source,
  multiple,
  onPhotoUpload,
  inputRef,
}: {
  id: string;
  source: PhotoSource;
  multiple: boolean;
  onPhotoUpload: PhotoUploadHandler;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const attrs = PHOTO_SOURCE_INPUT_ATTR[source];

  return (
    <input
      ref={inputRef}
      id={id}
      type="file"
      multiple={multiple}
      accept={attrs.accept}
      capture={attrs.capture}
      onChange={(event) => {
        onPhotoUpload(event, source);
        event.target.value = '';
      }}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}

function createSyntheticFileChangeEvent(files: File[]): React.ChangeEvent<HTMLInputElement> {
  const input = document.createElement('input');
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }
  input.files = dataTransfer.files;
  return { target: input } as React.ChangeEvent<HTMLInputElement>;
}

/**
 * Zone d'ajout de photos : caméra + media sur mobile, media seul sur desktop.
 */
export function PhotoUploadZone({
  onPhotoUpload,
  id,
  multiple = true,
  className,
}: PhotoUploadZoneProps) {
  const autoId = useId();
  const baseId = id ?? `photo-upload-${autoId}`;
  const { isDesktop } = useDeviceContext();
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
          onPhotoUpload(createSyntheticFileChangeEvent([file]), source);
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
    [onPhotoUpload, showToast]
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center w-full min-h-[180px] border-2 border-primary/30 dark:border-primary/40 rounded-xl p-4 sm:p-6 bg-primary/5 dark:bg-primary/10',
        className
      )}
    >
      <Camera className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3" aria-hidden="true" />
      <p className="text-base sm:text-lg font-bold text-primary uppercase tracking-wide text-center mb-1">
        Ajouter une photo
      </p>
      <p className="text-xs sm:text-sm text-muted-foreground text-center mb-4 max-w-sm">
        {isDesktop
          ? 'Importez une image depuis vos fichiers'
          : 'Prenez une photo ou importez depuis la galerie ou vos fichiers'}
      </p>

      <PhotoPickerActions variant="zone" onOpenSource={openPicker} />

      {(Object.keys(inputRefs) as PhotoSource[])
        .filter((source) => source === 'files' || !isNativeCameraAvailable())
        .map((source) => (
        <HiddenPhotoInput
          key={source}
          id={`${baseId}-${source}`}
          source={source}
          multiple={multiple}
          onPhotoUpload={onPhotoUpload}
          inputRef={inputRefs[source]}
        />
      ))}
    </div>
  );
}
