import { registerSW } from 'virtual:pwa-register';

/**
 * Enregistre le service worker PWA et applique automatiquement les mises à jour.
 */
export function setupPwa(): void {
  if (typeof window === 'undefined') return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] service worker enregistré', swUrl, registration);
      // Vérifie périodiquement les mises à jour pour éviter les chunks obsolètes
      // sur des sessions longues laissées ouvertes.
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisterError(error) {
      console.error('[PWA] échec enregistrement service worker', error);
    },
  });
}
