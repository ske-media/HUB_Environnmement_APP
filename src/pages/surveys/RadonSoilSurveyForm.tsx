import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { RadonSoilSurveySchema, RadonSoilSurvey } from '../../schema/radonSoilSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';

export function RadonSoilSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<RadonSoilSurvey>({
    resolver: zodResolver(RadonSoilSurveySchema),
    defaultValues: {
      nom_point_mesure: '',
      contexte_batiment: {
        type_batiment: 'Maison',
        presence_sous_sol: false,
      },
      conditions_meteo: {},
      instrumentation: {
        type_appareil: '',
        numero_serie: '',
        date_dernier_etalonnage: '',
      },
      methode_prelevement: {
        type_prelevement: 'Actif',
        profondeur_prelevement_m: 0,
        duree_mesure_min: 60,
      },
      resultats: {
        concentration_radon_bq_m3: 0,
      },
    },
  });

  const typePrelevement = watch('methode_prelevement.type_prelevement');

  // Charger les données existantes en mode édition
  useEffect(() => {
    const loadSurveyData = async () => {
      if (isEditMode && surveyId) {
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData);
          }
        } catch (err) {
          console.error('Erreur lors du chargement des données:', err);
          setError('Erreur lors du chargement des données du formulaire');
        }
      }
    };

    loadSurveyData();
  }, [isEditMode, surveyId, reset]);

  const onSubmit: SubmitHandler<RadonSoilSurvey> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      if (!siteId) {
        throw new Error('ID du site manquant');
      }

      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'radon_soil',
        siteId: siteId,
        createdBy: user.id,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout
      title={isEditMode ? 'Modifier la fiche Radon Sol' : 'Nouvelle fiche Radon Sol'}
      subtitle="Enregistrement des mesures de radon dans le sol"
      error={error}
      onBack={`/sites/${siteId}`}
    >
      <DevelopmentBanner className="mb-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section Contexte */}
        <FormSection title="Contexte" number={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              {...register('nom_point_mesure')}
              label="Nom du point de mesure"
              placeholder="Ex: Point A1"
              error={errors.nom_point_mesure?.message}
              isRequired
            />

            <InputField
              {...register('date')}
              type="date"
              label="Date"
            />

            <InputField
              {...register('heure')}
              type="time"
              label="Heure"
            />

            <InputField
              {...register('operateur')}
              label="Opérateur"
              placeholder="Nom de l'opérateur"
            />
          </div>

          {/* Coordonnées */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-foreground">Coordonnées</h4>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { lat, lng, alt } = await getPosition();
                    setValue('coordonnees.latitude', lat.toString());
                    setValue('coordonnees.longitude', lng.toString());
                    if (alt !== null && alt !== undefined) {
                      setValue('coordonnees.altitude', alt.toString());
                    }
                    showToast('success', 'Coordonnées remplies avec succès !');
                  } catch (err: any) {
                    showToast('warning', err.message || 'Géolocalisation indisponible. Saisie manuelle possible.', 6000);
                  }
                }}
                disabled={!!isGeolocating}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary glass-panel border border-primary/30 rounded-md hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGeolocating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Remplir avec la position actuelle
                  </>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                {...register('coordonnees.longitude')}
                label="Longitude"
                placeholder="Ex: 2.3522"
              />
              <InputField
                {...register('coordonnees.latitude')}
                label="Latitude"
                placeholder="Ex: 48.8566"
              />
              <InputField
                {...register('coordonnees.altitude')}
                label="Altitude (m)"
                placeholder="Ex: 35"
              />
            </div>
          </div>
          {/* Contexte bâtiment */}
          <div className="mt-6">
            <h4 className="text-md font-medium text-foreground mb-3">Contexte du bâtiment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                {...register('contexte_batiment.type_batiment')}
                label="Type de bâtiment"
                error={errors.contexte_batiment?.type_batiment?.message}
                isRequired
              >
                <option value="">Sélectionner...</option>
                <option value="Maison">Maison</option>
                <option value="ERP">ERP</option>
                <option value="Bureau">Bureau</option>
                <option value="Autre">Autre</option>
              </SelectField>

              <InputField
                {...register('contexte_batiment.type_ventilation')}
                label="Type de ventilation"
                placeholder="Ex: Naturelle, Mécanique"
              />
            </div>

            <div className="mt-4">
              <CheckboxField
                {...register('contexte_batiment.presence_sous_sol')}
                label="Présence de sous-sol"
              />
            </div>
          </div>

          {/* Conditions météo */}
          <div className="mt-6">
            <h4 className="text-md font-medium text-foreground mb-3">Conditions météorologiques</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                {...register('conditions_meteo.pression_atmospherique_hpa', { valueAsNumber: true })}
                type="number"
                step="0.1"
                label="Pression atmosphérique (hPa)"
                placeholder="Ex: 1013.25"
              />
              <InputField
                {...register('conditions_meteo.temperature_air_c', { valueAsNumber: true })}
                type="number"
                step="0.1"
                label="Température air (°C)"
                placeholder="Ex: 20.5"
              />
              <InputField
                {...register('conditions_meteo.humidite_relative_pct', { valueAsNumber: true })}
                type="number"
                step="0.1"
                label="Humidité relative (%)"
                placeholder="Ex: 65.0"
              />
              <div className="flex items-center">
                <CheckboxField
                  {...register('conditions_meteo.pluies_recentes')}
                  label="Pluies récentes"
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section Instrumentation */}
        <FormSection title="Instrumentation" number={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              {...register('instrumentation.type_appareil')}
              label="Type d'appareil"
              placeholder="Ex: AlphaGUARD, RAD7"
              error={errors.instrumentation?.type_appareil?.message}
              isRequired
            />

            <InputField
              {...register('instrumentation.numero_serie')}
              label="Numéro de série"
              placeholder="Ex: AG123456"
              error={errors.instrumentation?.numero_serie?.message}
              isRequired
            />

            <InputField
              {...register('instrumentation.date_dernier_etalonnage')}
              type="date"
              label="Date dernier étalonnage"
              error={errors.instrumentation?.date_dernier_etalonnage?.message}
              isRequired
            />
          </div>
        </FormSection>

        {/* Section Méthode */}
        <FormSection title="Méthode de prélèvement" number={3}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              {...register('methode_prelevement.type_prelevement')}
              label="Type de prélèvement"
              error={errors.methode_prelevement?.type_prelevement?.message}
              isRequired
            >
              <option value="">Sélectionner...</option>
              <option value="Actif">Actif</option>
              <option value="Passif">Passif</option>
            </SelectField>

            <InputField
              {...register('methode_prelevement.profondeur_prelevement_m', { valueAsNumber: true })}
              type="number"
              step="0.1"
              label="Profondeur prélèvement (m)"
              placeholder="Ex: 0.5"
              error={errors.methode_prelevement?.profondeur_prelevement_m?.message}
              isRequired
            />

            <InputField
              {...register('methode_prelevement.duree_mesure_min', { valueAsNumber: true })}
              type="number"
              step="1"
              label="Durée mesure (min)"
              placeholder="Ex: 60"
              error={errors.methode_prelevement?.duree_mesure_min?.message}
              isRequired
            />

            {typePrelevement === 'Actif' && (
              <InputField
                {...register('methode_prelevement.debit_pompage_l_min', { valueAsNumber: true })}
                type="number"
                step="0.1"
                label="Débit pompage (L/min)"
                placeholder="Ex: 1.0"
                error={errors.methode_prelevement?.debit_pompage_l_min?.message}
                isRequired
              />
            )}
          </div>
        </FormSection>

        {/* Section Résultats */}
        <FormSection title="Résultats" number={4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              {...register('resultats.concentration_radon_bq_m3', { valueAsNumber: true })}
              type="number"
              step="0.1"
              label="Concentration radon (Bq/m³)"
              placeholder="Ex: 150.5"
              error={errors.resultats?.concentration_radon_bq_m3?.message}
              isRequired
            />

            <InputField
              {...register('resultats.concentration_co2_pct', { valueAsNumber: true })}
              type="number"
              step="0.01"
              label="Concentration CO₂ (%)"
              placeholder="Ex: 0.04"
            />

            <InputField
              {...register('resultats.incertitude_mesure', { valueAsNumber: true })}
              type="number"
              step="0.1"
              label="Incertitude mesure (%)"
              placeholder="Ex: 5.0"
            />
          </div>

          <div className="mt-4">
            <TextareaField
              {...register('observations')}
              label="Observations"
              placeholder="Observations particulières..."
              rows={3}
            />
          </div>
        </FormSection>

          <div className="flex justify-center sm:justify-end items-start pt-8">
            <SubmitButton
            loading={loading}
            text={isEditMode ? 'Mettre à jour' : 'Enregistrer la mesure'}
            className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3"
          />
        </div>
      </form>
    </FormPageLayout>
  );
}
