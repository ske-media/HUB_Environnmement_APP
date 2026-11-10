import { isNativeCameraAvailable } from './nativeCamera';
import type { PhotoSource } from './photoSource';

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return isIOS() || isAndroid();
}

function isMobileWeb(): boolean {
  return isMobile() && !isNativeCameraAvailable();
}

function buildPhotoFilename(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const safeExt = ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg';
  return `hub-fiche-${Date.now()}.${safeExt}`;
}

function silentDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildPhotoFilename(file);
  anchor.rel = 'noopener';
  anchor.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Sauvegarde locale invisible des photos prises avec la caméra.
 *
 * - App native Capacitor : `@capacitor/camera` enregistre déjà dans la pellicule
 *   (`saveToGallery: true`). Aucune action requise.
 * - Mobile web : la photo est déjà enregistrée par l'appareil photo natif
 *   (input `capture="environment"`). Aucune action requise.
 * - Desktop : copie locale silencieuse en secours.
 * - Galerie / fichiers : pas de re-sauvegarde (déjà présents sur l'appareil).
 */
export function saveToCameraRollAsync(file: File, source: PhotoSource): void {
  if (source !== 'camera' || isNativeCameraAvailable() || isMobileWeb()) return;

  queueMicrotask(() => {
    try {
      silentDownload(file);
    } catch {
      // Échec silencieux
    }
  });
}

export function saveCameraPhotosToCameraRoll(files: File[], source: PhotoSource): void {
  if (source !== 'camera') return;
  for (const file of files) {
    saveToCameraRollAsync(file, source);
  }
}
