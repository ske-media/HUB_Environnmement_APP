import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { PiezometricSurveySchema, type PiezometricSurveyFormData } from '../../schema/piezometricSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { getLocalDateString } from '../../lib/utils';
import { useGeolocation } from '../../hooks/useGeolocation';

// Petit composant pour les calculs automatiques
const AutoCalculator = ({ control, setValue }: { control: Control<PiezometricSurveyFormData>, setValue: Function }) => {
  const [altitudeRepere, profondeurEau] = useWatch({
    control,
    name: ["altitude_repere_mNGF", "profondeur_eau_m"]
  });

  useEffect(() => {
    const alt = parseFloat(altitudeRepere || '0');
    const prof = parseFloat(profondeurEau || '0');
    if (!isNaN(alt) && !isNaN(prof) && alt > 0) {
      const niveauPz = alt - prof;
      setValue('niveau_piezometrique_mNGF', niveauPz.toFixed(2), { shouldValidate: false });
    } else {
        setValue('niveau_piezometrique_mNGF', '', { shouldValidate: false });
    }
  }, [altitudeRepere, profondeurEau, setValue]);

  return null;
};

export function PiezometricSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);
  const { getPosition, isLoading: isGeolocating } = useGeolocation();

  const { register, handleSubmit, formState: { errors }, reset, control, setValue, watch } = useForm<PiezometricSurveyFormData>({
    resolver: zodResolver(PiezometricSurveySchema),
    defaultValues: {
      date_releve: getLocalDateString(),
      heure_releve: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      presence_flottant: false,
    },
  });

  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as PiezometricSurveyFormData);
          }
        } catch (err: any) {
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData]);

  const onSubmit: SubmitHandler<PiezometricSurveyFormData> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'piezometric',
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData: formData,
      });

      if (result.status === 'pending') {
        showToast(
          'warning',
          "Synchronisation en attente — la fiche sera envoyée dès le retour du réseau.",
          0,
          'sync-queue-banner',
        );
      }
      navigate(`/sites/${siteId}`);
    } catch (err: any) {
      setError('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout 
      siteId={siteId!} 
      title={`${isEditMode ? 'Modifier la' : 'Nouvelle'} Fiche Piézométrique`}
      subtitle="Enregistrement des relevés piézométriques"
    >
      <DevelopmentBanner className="mb-6" />
      <AutoCalculator control={control} setValue={setValue} />
      {loading && isEditMode ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34519e]"></div>
          <span className="ml-2 text-muted-foreground">Chargement des données...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div><label>Nom de l'ouvrage (Pz)</label><input type="text" {...register("nom_ouvrage")} className="input-field" />{errors.nom_ouvrage && <p className="error-message">{errors.nom_ouvrage.message}</p>}</div>
            <div></div>
            <div><label>Date du relevé</label><input type="date" {...register("date_releve")} className="input-field" />{errors.date_releve && <p className="error-message">{errors.date_releve.message}</p>}</div>
            <div><label>Heure du relevé</label><input type="time" {...register("heure_releve")} className="input-field" />{errors.heure_releve && <p className="error-message">{errors.heure_releve.message}</p>}</div>
            <div><label>Météo</label><input type="text" {...register("meteo")} placeholder="Ensoleillé, pluvieux..." className="input-field" /></div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Coordonnées GPS</h3>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { lat, lng, alt } = await getPosition();
                      setValue('coordonnees.latitude', lat);
                      setValue('coordonnees.longitude', lng);
                      if (alt !== null && alt !== undefined) {
                        setValue('coordonnees.altitude', alt);
                      }
                      showToast('success', 'Coordonnées remplies avec succès !');
                    } catch (err: any) {
                      showToast('warning', err.message || 'Géolocalisation indisponible. Saisie manuelle possible.', 6000);
                    }
                  }}
                  disabled={!!isGeolocating}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary glass-panel border border-primary/30 rounded-md hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGeolocating ? 'Recherche...' : 'Remplir avec la position actuelle'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div><label>Longitude</label><input type="number" step="0.000001" {...register("coordonnees.longitude")} className="input-field" /></div>
                <div><label>Latitude</label><input type="number" step="0.000001" {...register("coordonnees.latitude")} className="input-field" /></div>
                <div><label>Altitude (m)</label><input type="number" step="0.01" {...register("coordonnees.altitude")} className="input-field" /></div>
              </div>
              <div className="mt-4">
                <label>Lieu de repère (optionnel)</label>
                <input type="text" {...register("lieu_repere")} className="input-field" placeholder="Ex: Près du portail Nord, angle du bâtiment technique" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Mesure</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div><label>Point de repère</label><input type="text" {...register("point_de_repere")} placeholder="Haut du tubage, sol..." className="input-field" />{errors.point_de_repere && <p className="error-message">{errors.point_de_repere.message}</p>}</div>
            <div><label>Altitude du repère (m NGF)</label><input type="number" step="0.01" {...register("altitude_repere_mNGF")} className="input-field" /></div>
            <div><label>Profondeur de l'eau / repère (m)</label><input type="number" step="0.01" {...register("profondeur_eau_m")} className="input-field" />{errors.profondeur_eau_m && <p className="error-message">{errors.profondeur_eau_m.message}</p>}</div>
            <div><label>Niveau piézométrique (m NGF)</label><input type="number" {...register("niveau_piezometrique_mNGF")} className="input-field bg-surface-200 dark:bg-surface-700" readOnly /></div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Observations</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-2"><input type="checkbox" {...register("presence_flottant")} className="h-4 w-4 rounded" /><label className="text-sm text-foreground dark:text-white">Présence d'une phase flottante</label></div>
            <div><label>Épaisseur du flottant (mm)</label><input type="number" step="0.1" {...register("epaisseur_flottant_mm")} className="input-field" /></div>
            <div><label>Remarques</label><textarea {...register("remarques")} rows={4} className="input-field" /></div>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end items-start pt-8">
          <SubmitButton
            loading={loading}
            text="Enregistrer"
            className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3"
          />
        </div>
      </form>
      )}
    </FormPageLayout>
  );
}