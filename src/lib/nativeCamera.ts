import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export function isNativeCameraAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

function isUserCancelledError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /cancel/i.test(message) || /user.*(denied|dismiss)/i.test(message);
}

function photoMimeType(photo: Photo): string {
  return photo.format === 'png' ? 'image/png' : 'image/jpeg';
}

function buildFileName(photo: Photo): string {
  return `photo-${Date.now()}.${photo.format === 'png' ? 'png' : 'jpg'}`;
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Lecture du fichier local impossible (${response.status})`);
  return response.blob();
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Convertit le résultat Capacitor en `File`.
 *
 * Trois stratégies successives, car `webPath` est inexploitable sur certaines
 * combinaisons Android / WebView (URI de content provider non résolue, chemin
 * réécrit par le système de fichiers scopé) :
 * 1. `fetch(webPath)`, le cas nominal ;
 * 2. `fetch(Capacitor.convertFileSrc(path))`, qui reconstruit une URL lisible
 *    par la WebView depuis le chemin natif ;
 * 3. re-capture en `Base64`, qui contourne totalement le système de fichiers.
 */
async function photoToFile(photo: Photo, source: CameraSource): Promise<File> {
  const mimeType = photoMimeType(photo);
  const fileName = buildFileName(photo);
  const attemptErrors: unknown[] = [];

  const candidateUrls = [
    photo.webPath,
    photo.path ? Capacitor.convertFileSrc(photo.path) : undefined,
  ].filter((url): url is string => Boolean(url));

  for (const url of candidateUrls) {
    try {
      const blob = await fetchAsBlob(url);
      if (blob.size > 0) return new File([blob], fileName, { type: mimeType });
    } catch (error) {
      attemptErrors.push(error);
    }
  }

  try {
    const base64Photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source,
      saveToGallery: source === CameraSource.Camera,
    });
    if (base64Photo.base64String) {
      const blob = base64ToBlob(base64Photo.base64String, photoMimeType(base64Photo));
      return new File([blob], buildFileName(base64Photo), { type: photoMimeType(base64Photo) });
    }
  } catch (error) {
    if (isUserCancelledError(error)) throw error;
    attemptErrors.push(error);
  }

  console.warn('[nativeCamera] lecture de la photo impossible', attemptErrors);
  throw new Error(
    "La photo n'a pas pu être lue sur l'appareil. Réessayez ou sélectionnez-la depuis la galerie."
  );
}

async function requestCameraPermissions(): Promise<void> {
  const permissions = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  if (permissions.camera !== 'granted' && permissions.camera !== 'limited') {
    throw new Error('Permission caméra refusée');
  }
}

async function requestPhotosPermissions(): Promise<void> {
  const permissions = await Camera.requestPermissions({ permissions: ['photos'] });
  if (permissions.photos !== 'granted' && permissions.photos !== 'limited') {
    throw new Error("Permission d'accès aux photos refusée");
  }
}

/**
 * Ouvre l'appareil photo natif (Capacitor) et renvoie un `File` prêt pour l'upload.
 * Chaque cliché est enregistré dans la pellicule (`saveToGallery: true`).
 */
export async function capturePhotoNative(): Promise<File | null> {
  await requestCameraPermissions();

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: true,
  });

  if (!photo.webPath && !photo.path) return null;
  return photoToFile(photo, CameraSource.Camera);
}

/**
 * Ouvre la galerie via le plugin natif. Sur Android 13+, le sélecteur système
 * du plugin est plus fiable que l'`input[type=file]` de la WebView, qui peut
 * échouer sans message lorsque `READ_MEDIA_IMAGES` n'est pas accordée.
 */
export async function pickPhotoFromGalleryNative(): Promise<File | null> {
  await requestPhotosPermissions();

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
  });

  if (!photo.webPath && !photo.path) return null;
  return photoToFile(photo, CameraSource.Photos);
}

export async function tryCapturePhotoNative(): Promise<File | null> {
  try {
    return await capturePhotoNative();
  } catch (error) {
    if (isUserCancelledError(error)) return null;
    throw error;
  }
}

export async function tryPickPhotoFromGalleryNative(): Promise<File | null> {
  try {
    return await pickPhotoFromGalleryNative();
  } catch (error) {
    if (isUserCancelledError(error)) return null;
    throw error;
  }
}
