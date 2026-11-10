import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { AmbientAirSurveySchema, type AmbientAirSurveyFormData } from '../../schema/ambientAirSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { getLocalDateString } from '../../lib/utils';

const SAMPLING_TYPES = [
  { value: 'active-pump', label: 'Actif avec pompe' },
  { value: 'active-natural', label: 'Actif naturel' },
  { value: 'passive', label: 'Passif' }
];

const SUPPORT_TYPES = [
  { value: 'xad2', label: 'XAD-2' },
  { value: 'charbon-actif', label: 'Charbon actif' }
];

export function AmbientAirSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<AmbientAirSurveyFormData>({
    resolver: zodResolver(AmbientAirSurveySchema),
    defaultValues: {
      samplingName: '',
      date: getLocalDateString(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      location: {
        room: '',
        position: '',
        coordinates: {
          latitude: '',
          longitude: ''
        }
      },
      weatherConditions: {
        description: '',
        externalTemp: '',
        internalTemp: '',
        pressure: '',
        humidity: '',
        windSpeedDirection: ''
      },
      sampling: {
        type: 'active-pump',
        supportCount: '1',
        supportType: '',
        installationDescription: '',
        height: '',
        ventilation: false,
        recentWork: '',
        heating: '',
        interferingSources: '',
        interferingActivities: ''
      },
      measurements: {
        pid: '',
        o2: '',
        h2s: '',
        ch4: '',
        co: ''
      },
      flow: {
        startTime: '',
        endTime: '',
        duration: '',
        flowRates: {
          start: '',
          intermediate: '',
          end: ''
        },
        averageFlow: '',
        totalVolume: ''
      },
      laboratory: {
        name: '',
        packaging: '',
        transporter: '',
        deliveryDate: '',
        substancesToAnalyze: ''
      }
    },
  });

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as AmbientAirSurveyFormData);
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
  }, [isEditMode, surveyId, reset]);

  const onSubmit: SubmitHandler<AmbientAirSurveyFormData> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'ambient_air',
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
      title={`${isEditMode ? 'Modifier' : 'Nouvelle'} Fiche prélèvement d'Air Ambiant`}
      subtitle="Enregistrement des données de terrain"
    >
      <DevelopmentBanner className="mb-6" />
      {loading && isEditMode ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34519e]"></div>
          <span className="ml-2 text-muted-foreground">Chargement des données...</span>
        </div>
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
            <InputField
              name="samplingName"
              label="Nom du prélèvement"
              register={register}
              errors={errors}
              placeholder="Ex: Prélèvement Air - Zone Nord"
              isRequired={true}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="date"
                label="Date"
                register={register}
                errors={errors}
                type="date"
                isRequired={true}
              />
              <InputField
                name="time"
                label="Heure"
                register={register}
                errors={errors}
                type="time"
                isRequired={true}
              />
            </div>
          </FormSection>

          {/* --- SECTION 2 : LOCALISATION --- */}
          <FormSection number={2} title="Localisation">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="location.room"
                label="Pièce"
                register={register}
                errors={errors}
                placeholder="Ex: Bureau principal"
              />
              <InputField
                name="location.position"
                label="Position dans la pièce"
                register={register}
                errors={errors}
                placeholder="Ex: Centre de la pièce"
              />
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#34519e]/10 rounded-lg flex items-center justify-center">
                    <span className="text-[#34519e] font-bold text-sm">📍</span>
                  </div>
                  Coordonnées GPS
                </h3>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { lat, lng } = await getPosition();
                      setValue('location.coordinates.latitude', lat);
                      setValue('location.coordinates.longitude', lng);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  name="location.coordinates.latitude"
                  label="Latitude"
                  register={register}
                  errors={errors}
                  placeholder="48.8566"
                />
                <InputField
                  name="location.coordinates.longitude"
                  label="Longitude"
                  register={register}
                  errors={errors}
                  placeholder="2.3522"
                />
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 3 : CONDITIONS MÉTÉOROLOGIQUES --- */}
          <FormSection number={3} title="Conditions météorologiques">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="weatherConditions.description"
                label="Météo"
                register={register}
                errors={errors}
                placeholder="Ensoleillé, nuageux..."
              />
              <InputField
                name="weatherConditions.externalTemp"
                label="Température extérieure (°C)"
                register={register}
                errors={errors}
                type="number"
                step="0.1"
                placeholder="20.5"
              />
              <InputField
                name="weatherConditions.internalTemp"
                label="Température intérieure (°C)"
                register={register}
                errors={errors}
                type="number"
                step="0.1"
                placeholder="22.0"
              />
              <InputField
                name="weatherConditions.pressure"
                label="Pression (Pa)"
                register={register}
                errors={errors}
                type="number"
                placeholder="101325"
              />
              <InputField
                name="weatherConditions.humidity"
                label="Humidité (%)"
                register={register}
                errors={errors}
                type="number"
                placeholder="65"
              />
              <InputField
                name="weatherConditions.windSpeedDirection"
                label="Vent (vitesse/sens)"
                register={register}
                errors={errors}
                placeholder="Ex: 15 km/h Nord"
              />
            </div>
          </FormSection>

          {/* --- SECTION 4 : DESCRIPTION DU PRÉLÈVEMENT --- */}
          <FormSection number={4} title="Description du prélèvement">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                name="sampling.type"
                label="Type d'échantillonnage"
                register={register}
                errors={errors}
                options={SAMPLING_TYPES}
                isRequired={true}
              />
              <InputField
                name="sampling.supportCount"
                label="Nombre de support"
                register={register}
                errors={errors}
                type="number"
                placeholder="1"
                isRequired={true}
              />
              <SelectField
                name="sampling.supportType"
                label="Nature des supports"
                register={register}
                errors={errors}
                options={SUPPORT_TYPES}
                placeholder="Sélectionner..."
              />
              <InputField
                name="sampling.height"
                label="Hauteur de l'ouvrage (m)"
                register={register}
                errors={errors}
                type="number"
                step="0.1"
                placeholder="2.5"
              />
            </div>
            
            <TextareaField
              name="sampling.installationDescription"
              label="Description de l'installation"
              register={register}
              errors={errors}
              rows={3}
              placeholder="Description détaillée de l'installation..."
            />

            <div className="flex items-center gap-3 p-4 bg-surface-200 dark:bg-surface-700 rounded-xl">
              <CheckboxField
                name="sampling.ventilation"
                label="Présence d'aération / Ventilation"
                register={register}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextareaField
                name="sampling.recentWork"
                label="Travaux récents"
                register={register}
                errors={errors}
                rows={2}
                placeholder="Travaux récents effectués..."
              />
              <InputField
                name="sampling.heating"
                label="Chauffage"
                register={register}
                errors={errors}
                placeholder="Type de chauffage..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextareaField
                name="sampling.interferingSources"
                label="Sources d'interférences"
                register={register}
                errors={errors}
                rows={2}
                placeholder="Stockage produits, matériaux..."
              />
              <TextareaField
                name="sampling.interferingActivities"
                label="Activités interférantes"
                register={register}
                errors={errors}
                rows={2}
                placeholder="Activités pouvant interférer..."
              />
            </div>
          </FormSection>

          {/* --- SECTION 5 : MESURES SEMI-QUANTITATIVES --- */}
          <FormSection number={5} title="Mesures semi-quantitatives">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <InputField
                name="measurements.pid"
                label="PID (ppmV)"
                register={register}
                errors={errors}
                type="number"
                placeholder="0.0"
              />
              <InputField
                name="measurements.o2"
                label="O2 (%)"
                register={register}
                errors={errors}
                type="number"
                placeholder="20.9"
              />
              <InputField
                name="measurements.h2s"
                label="H2S (ppmV)"
                register={register}
                errors={errors}
                type="number"
                placeholder="0.0"
              />
              <InputField
                name="measurements.ch4"
                label="CH4 (%)"
                register={register}
                errors={errors}
                type="number"
                placeholder="0.0"
              />
              <InputField
                name="measurements.co"
                label="CO (ppmV)"
                register={register}
                errors={errors}
                type="number"
                placeholder="0.0"
              />
            </div>
          </FormSection>

          {/* --- SECTION 6 : CONTRÔLE DE DÉBIT --- */}
          <FormSection number={6} title="Contrôle de débit">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField
                name="flow.startTime"
                label="Heure début"
                register={register}
                errors={errors}
                type="time"
              />
              <InputField
                name="flow.endTime"
                label="Heure fin"
                register={register}
                errors={errors}
                type="time"
              />
              <InputField
                name="flow.duration"
                label="Durée"
                register={register}
                errors={errors}
                placeholder="Ex: 2h30"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InputField
                name="flow.flowRates.start"
                label="Débit T0 (début)"
                register={register}
                errors={errors}
                placeholder="Ex: 1.2 l/min"
              />
              <InputField
                name="flow.flowRates.intermediate"
                label="Débit T1 (inter.)"
                register={register}
                errors={errors}
                placeholder="Ex: 1.1 l/min"
              />
              <InputField
                name="flow.flowRates.end"
                label="Débit T2 (fin)"
                register={register}
                errors={errors}
                placeholder="Ex: 1.0 l/min"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="flow.averageFlow"
                label="Débit moyen (l/min)"
                register={register}
                errors={errors}
                placeholder="Ex: 1.1 l/min"
              />
              <InputField
                name="flow.totalVolume"
                label="Volume total (l)"
                register={register}
                errors={errors}
                placeholder="Ex: 165 l"
              />
            </div>
          </FormSection>

          {/* --- SECTION 7 : CONDITIONNEMENT ET TRANSPORT --- */}
          <FormSection number={7} title="Conditionnement et transport">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="laboratory.name"
                label="Laboratoire"
                register={register}
                errors={errors}
                placeholder="Nom du laboratoire"
              />
              <InputField
                name="laboratory.packaging"
                label="Conditionnement"
                register={register}
                errors={errors}
                placeholder="Type de conditionnement"
              />
              <InputField
                name="laboratory.transporter"
                label="Transporteur"
                register={register}
                errors={errors}
                placeholder="Nom du transporteur"
              />
              <InputField
                name="laboratory.deliveryDate"
                label="Date et heure de remise"
                register={register}
                errors={errors}
                type="datetime-local"
              />
            </div>
            
            <TextareaField
              name="laboratory.substancesToAnalyze"
              label="Substances recherchées"
              register={register}
              errors={errors}
              rows={3}
              placeholder="Liste des substances à analyser..."
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