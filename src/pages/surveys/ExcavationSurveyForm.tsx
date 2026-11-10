import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { ExcavationSurveySchema, type ExcavationSurveyFormData } from '../../schema/excavationSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { FormSkeleton } from '../../components/forms/FormSkeleton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';

export function ExcavationSurveyForm() {
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

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm<ExcavationSurveyFormData>({
    resolver: zodResolver(ExcavationSurveySchema),
    defaultValues: {
      nom_projet: '',
      client: '',
      site_commune: '',
      responsable_projet: '',
      operateur: '',
      date_heure: '',
      meteo: '',
      zone_source: '',
      prelevements: [
        { point_prelevement: 'Bord de fouille 1', profondeur_prelevee: '', surface_prelevee: '', criteres_organoleptiques: '', mesure_pid: '', echantillon: '', coordonnees_xy: '' },
        { point_prelevement: 'Bord de fouille 2', profondeur_prelevee: '', surface_prelevee: '', criteres_organoleptiques: '', mesure_pid: '', echantillon: '', coordonnees_xy: '' },
        { point_prelevement: 'Bord de fouille 3', profondeur_prelevee: '', surface_prelevee: '', criteres_organoleptiques: '', mesure_pid: '', echantillon: '', coordonnees_xy: '' },
        { point_prelevement: 'Bord de fouille 4', profondeur_prelevee: '', surface_prelevee: '', criteres_organoleptiques: '', mesure_pid: '', echantillon: '', coordonnees_xy: '' },
        { point_prelevement: 'Fond de fouille', profondeur_prelevee: '', surface_prelevee: '', criteres_organoleptiques: '', mesure_pid: '', echantillon: '', coordonnees_xy: '' },
      ],
      gestion_echantillons: {
        flaconnage: 'Bocaux 350 ml',
        date_heure_expedition: '',
        laboratoire: '',
        conditionnement: 'Glacière réfrigérée',
        substances_recherchees: '',
      },
      localisation_prelevements_plan: '',
    }
  });

  const { fields: prelevementFields } = useFieldArray({
    control,
    name: 'prelevements'
  });

  // Pré-remplir les champs depuis les données du site (cohérence métier).
  useEffect(() => {
    if (!siteData) return;
    if (siteData.name) setValue('client', siteData.name);
    if (siteData.city) setValue('site_commune', siteData.city);
  }, [siteData, setValue]);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId && siteId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const surveyData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (surveyData) {
            const loadedData = surveyData as any;
            
            // Préparer les données avec compatibilité ascendante
            const formData: any = { ...loadedData };
            
            // Toujours utiliser les données du site pour garantir la cohérence
            if (siteData?.name) {
              formData.client = siteData.name;
            }
            if (siteData?.city) {
              formData.site_commune = siteData.city;
            }
            
            reset(formData as ExcavationSurveyFormData);
          }
        } catch (err: any) {
          console.error('Error loading survey data:', err);
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      
      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData]);

  const onSubmit: SubmitHandler<ExcavationSurveyFormData> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'excavation',
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
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <FormPageLayout 
      siteId={siteId!} 
      title={`${isEditMode ? 'Modifier' : 'Nouvelle'} Fiche de suivi de prélèvement`}
      subtitle="Bords et fonds de fouille"
    >
      <DevelopmentBanner className="mb-6" />
      {loading && isEditMode ? (
        <FormSkeleton />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-red-400" /></div>
                <div className="ml-3"><p className="text-sm text-red-700">{error}</p></div>
              </div>
            </div>
          )}

          {/* --- SECTION 1 : INFORMATIONS GÉNÉRALES --- */}
          <FormSection number={1} title="Informations générales">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InputField
                name="nom_projet"
                label="Nom du projet"
                register={register}
                errors={errors}
                    placeholder="Ex: Projet ABC"
                  />
              <InputField
                name="responsable_projet"
                label="Responsable projet"
                register={register}
                errors={errors}
                    placeholder="Nom du responsable"
                  />
              <InputField
                name="operateur"
                label="Opérateur"
                register={register}
                errors={errors}
                    placeholder="Nom de l'opérateur"
                  />
              <InputField
                name="date_heure"
                label="Date/Heure"
                register={register}
                errors={errors}
                    type="datetime-local" 
              />
              <InputField
                name="meteo"
                label="Météo"
                register={register}
                errors={errors}
                    placeholder="Ex: Ensoleillé"
                  />
              <InputField
                name="zone_source"
                label="Zone source"
                register={register}
                errors={errors}
                    placeholder="Ex: Zone Nord"
                  />
              <div className="md:col-span-2 lg:col-span-3">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    name="coordonnees.longitude"
                    label="Longitude"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 2.352222"
                  />
                  <InputField
                    name="coordonnees.latitude"
                    label="Latitude"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 48.856614"
                  />
                  <InputField
                    name="coordonnees.altitude"
                    label="Altitude (m)"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 45.2"
                  />
                </div>
                <div className="mt-6">
                  <InputField
                    name="lieu_repere"
                    label="Lieu de repère (optionnel)"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Angle Nord-Est du chantier, près de la benne"
                  />
                </div>
              </div>
            </div>
                </FormSection>

          {/* --- SECTION 2 : PRÉLÈVEMENTS --- */}
          <FormSection 
            number={2} 
            title="Prélèvements"
          >
              {errors.prelevements && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.prelevements.message}
                  </p>
                </div>
              )}

                    {prelevementFields.map((field, index) => (
              <div key={field.id} className="bg-surface-200 dark:bg-surface-700 p-6 rounded-xl border border-white/10 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Prélèvement {index + 1}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground dark:text-white mb-2">
                      Point de prélèvement
                    </label>
                    <div className="px-3 py-2 bg-surface-200 dark:bg-surface-600 border border-white/10 rounded-md text-foreground">
                      {field.point_prelevement}
                    </div>
                  </div>
                  <InputField
                    name={`prelevements.${index}.profondeur_prelevee`}
                    label="Profondeur prélevée (m)"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 0.5"
                  />
                  <InputField
                    name={`prelevements.${index}.surface_prelevee`}
                    label="Surface prélevée (m²)"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 0.25"
                  />
                  <InputField
                    name={`prelevements.${index}.criteres_organoleptiques`}
                    label="Critères organoleptiques"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Odeur, couleur..."
                  />
                  <InputField
                    name={`prelevements.${index}.mesure_pid`}
                    label="Mesure PID"
                    register={register}
                    errors={errors}
                    placeholder="Ex: 150 ppm"
                  />
                  <InputField
                    name={`prelevements.${index}.echantillon`}
                    label="Échantillon"
                    register={register}
                    errors={errors}
                    placeholder="Ex: ECH-001"
                  />
                  <InputField
                    name={`prelevements.${index}.coordonnees_xy`}
                    label="Coordonnées XY"
                    register={register}
                    errors={errors}
                    placeholder="Ex: X: 123, Y: 456"
                  />
                </div>
              </div>
            ))}
              </FormSection>

          {/* --- SECTION 3 : GESTION DES ÉCHANTILLONS --- */}
          <FormSection 
            number={3} 
            title="Gestion des échantillons"
          >
              {errors.gestion_echantillons && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.gestion_echantillons.message}
                  </p>
                </div>
              )}

              <div className="bg-surface-200 dark:bg-surface-700 p-6 rounded-xl border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputField
                    name="gestion_echantillons.flaconnage"
                    label="Flaconnage"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Bocaux 350 ml"
                  />
                  <InputField
                    name="gestion_echantillons.date_heure_expedition"
                    label="Date/Heure d'expédition"
                    register={register}
                    errors={errors}
                    type="datetime-local"
                  />
                  <InputField
                    name="gestion_echantillons.laboratoire"
                    label="Laboratoire"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Agrolab"
                  />
                  <InputField
                    name="gestion_echantillons.conditionnement"
                    label="Conditionnement"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Conservation à 4°C"
                  />
                  <div className="md:col-span-2">
                    <InputField
                      name="gestion_echantillons.substances_recherchees"
                      label="Substances recherchées"
                      register={register}
                      errors={errors}
                      placeholder="Ex: HAP, BTEX, Métaux lourds..."
                    />
                  </div>
                </div>
              </div>
              </FormSection>

          {/* --- SECTION 4 : PLAN --- */}
          <FormSection 
            number={4} 
            title="Localisation des prélèvements (plan)"
          >
            <TextareaField
              name="localisation_prelevements_plan"
              label="Description de la localisation des prélèvements"
              register={register}
              errors={errors}
              placeholder="Décrivez la localisation des prélèvements sur le plan..."
              rows={4}
            />
          </FormSection>
          
          <div className="flex justify-center sm:justify-end items-start pt-8">
            <SubmitButton loading={loading} className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3" />
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}
