import { useCallback } from 'react';
import { UseFormSetValue } from 'react-hook-form';
import { useGeolocation } from './useGeolocation';
import { useToast } from '../contexts/ToastContext';

interface GeolocationFieldMapping {
  latitude: string;
  longitude: string;
  altitude?: string;
}

interface UseSurveyGeolocationOptions {
  setValue: UseFormSetValue<any>;
  fieldMapping: GeolocationFieldMapping;
  showSuccessMessage?: boolean;
  /** Callback optionnel exécuté quand l'utilisateur / l'erreur force la saisie manuelle. */
  onFallbackToManual?: () => void;
}

/**
 * Hook personnalisé pour gérer la géolocalisation dans les formulaires de fiche
 * Simplifie l'utilisation de la géolocalisation avec react-hook-form
 */
export function useSurveyGeolocation(options: UseSurveyGeolocationOptions) {
  const { setValue, fieldMapping, showSuccessMessage = true, onFallbackToManual } = options;
  const {
    getPosition,
    isLoading: isGeolocating,
    manualMode,
    fallbackToManual,
  } = useGeolocation();
  const { showToast } = useToast();

  const handleGeolocate = useCallback(async () => {
    try {
      const { lat, lng, alt } = await getPosition();

      setValue(fieldMapping.latitude, lat, { shouldValidate: true });
      setValue(fieldMapping.longitude, lng, { shouldValidate: true });

      if (alt !== null && alt !== undefined && fieldMapping.altitude) {
        setValue(fieldMapping.altitude, alt, { shouldValidate: true });
      }

      if (showSuccessMessage) {
        showToast('success', 'Coordonnées remplies avec succès !');
      }
    } catch (err: any) {
      const message = err?.message || 'Erreur lors de la récupération de la position.';
      showToast('warning', message, 6000);
      fallbackToManual();
      onFallbackToManual?.();
    }
  }, [
    getPosition,
    setValue,
    fieldMapping,
    showSuccessMessage,
    showToast,
    fallbackToManual,
    onFallbackToManual,
  ]);

  const requestManualInput = useCallback(() => {
    fallbackToManual();
    onFallbackToManual?.();
    showToast('info', 'Saisie manuelle activée pour les coordonnées.', 3500);
  }, [fallbackToManual, onFallbackToManual, showToast]);

  return {
    handleGeolocate,
    isGeolocating,
    manualMode,
    requestManualInput,
  };
}
