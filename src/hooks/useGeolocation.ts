import { useCallback, useState } from 'react';

interface Position {
  lat: number;
  lng: number;
  alt: number | null;
}

interface GeolocationError {
  code?: number;
  message: string;
}

const GEOLOCATION_TIMEOUT_MS = 20_000;

/**
 * Hook de géolocalisation avec délai maximal et repli sur la saisie manuelle.
 *
 * - `timeout` : 20 s (haute précision + `maximumAge: 0`).
 * - `fallbackToManual` : bascule explicitement le hook en mode "saisie manuelle"
 *   (les formulaires s'en servent pour débloquer la saisie libre des coords).
 * - L'erreur renvoyée contient le code d'origine (`PERMISSION_DENIED`, `TIMEOUT`…)
 *   afin que l'UI puisse proposer un message adapté.
 */
export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [manualMode, setManualMode] = useState(false);

  const getPosition = useCallback((): Promise<Position> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err: GeolocationError = {
          message: "La géolocalisation n'est pas supportée par ce navigateur.",
        };
        setError(err);
        reject(err);
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = position.coords;
          const result: Position = {
            lat: Math.round(coords.latitude * 1000000) / 1000000,
            lng: Math.round(coords.longitude * 1000000) / 1000000,
            alt:
              coords.altitude !== null && coords.altitude !== undefined
                ? Math.round(coords.altitude * 100) / 100
                : null,
          };
          setIsLoading(false);
          resolve(result);
        },
        (positionError) => {
          let errorMessage: string;
          switch (positionError.code) {
            case 1:
              errorMessage =
                "L'accès à la géolocalisation a été refusé. Vous pouvez saisir les coordonnées manuellement.";
              break;
            case 2:
              errorMessage =
                "Position indisponible (signal GPS faible). Vous pouvez saisir les coordonnées manuellement.";
              break;
            case 3:
              errorMessage =
                'La géolocalisation a expiré (20 s). Vous pouvez saisir les coordonnées manuellement.';
              break;
            default:
              errorMessage =
                'Géolocalisation impossible. Vous pouvez saisir les coordonnées manuellement.';
          }

          const err: GeolocationError = {
            code: positionError.code,
            message: errorMessage,
          };
          setError(err);
          setIsLoading(false);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: 0,
        }
      );
    });
  }, []);

  const fallbackToManual = useCallback(() => {
    setError(null);
    setIsLoading(false);
    setManualMode(true);
  }, []);

  const resetManual = useCallback(() => setManualMode(false), []);

  return {
    isLoading,
    error,
    manualMode,
    getPosition,
    fallbackToManual,
    resetManual,
  };
}
