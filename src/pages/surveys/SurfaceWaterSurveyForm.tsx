import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { SurfaceWaterSurveySchema, type SurfaceWaterSurveyFormData } from '../../schema/surfaceWaterSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { getLocalDateString } from '../../lib/utils';
import { useSurveyPhotos } from '../../hooks/useSurveyPhotos';
import { useSurveySubmit } from '../../hooks/useSurveySubmit';
import { PhotoUploadPreview } from '../../components/forms/PhotoUploadPreview';
import { PhotoUploadZone } from '../../components/forms/PhotoUploadZone';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';

const WEATHER_CONDITIONS = [{ value: 'sunny', label: 'Ensoleillé' }, { value: 'cloudy', label: 'Nuageux' }, { value: 'windy', label: 'Venteux' }, { value: 'rainy', label: 'Pluvieux' }] as const;
const SAMPLING_TYPES = [{ value: 'shore', label: 'De la rive' }, { value: 'upstream', label: 'En amont du site' }, { value: 'downstream', label: 'En aval du site' }, { value: 'other', label: 'Autre' }] as const;
const SAMPLING_EQUIPMENT = [{ value: 'bucket', label: 'Seau' }, { value: 'sampling-rod', label: 'Canne de prélèvement' }, { value: 'pump', label: 'Pompe' }] as const;
const WATER_TYPES = [{ value: 'river', label: 'Fleuve' }, { value: 'stream', label: 'Rivière' }, { value: 'brook', label: 'Ruisseau' }, { value: 'lake', label: 'Lac' }, { value: 'pond', label: 'Étang' }] as const;
const FLOW_RATES = [{ value: 'stagnant', label: 'Stagnant' }, { value: 'low', label: 'Faible' }, { value: 'high', label: 'Fort' }] as const;
const FLOW_TYPES = [{ value: 'laminar', label: 'Laminaire' }, { value: 'intermediate', label: 'Intermédiaire' }, { value: 'turbulent', label: 'Turbulent' }] as const;
const TURBIDITY_LEVELS = [{ value: 'low', label: 'Faible' }, { value: 'medium', label: 'Moyenne' }, { value: 'high', label: 'Forte' }] as const;
const LABORATORIES = [{ value: 'agrolab', label: 'Agrolab' }, { value: 'als_france', label: 'ALS France' }] as const;

export function SurfaceWaterSurveyForm() {
  const { siteId, surveyId } = useParams();
  const isEditMode = Boolean(surveyId);
  
  // Hook pour gérer les photos
  const {
    photoFiles,
    photoPreviews,
    uploadProgress,
    handlePhotoUpload,
    handleDeletePhoto,
  } = useSurveyPhotos({ maxSizeMB: 10 });

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<SurfaceWaterSurveyFormData>({
    resolver: zodResolver(SurfaceWaterSurveySchema),
    defaultValues: {
      generalInfo: {
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: getLocalDateString(),
        weatherCondition: 'sunny',
      },
      sampling: { type: 'shore', equipment: 'bucket' },
      stationDescription: { waterType: 'river', estimatedFlow: 'low', flowType: 'laminar' },
      fieldObservations: { turbidity: 'low', hasLeavesMoss: false, hasFloating: false, hasShade: false },
      sampleManagement: { laboratory: 'agrolab' },
    }
  });
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isEditMode || !surveyId) return;

    const loadSurveyData = async () => {
      try {
        const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
        if (specificData) {
          const formData: any = { ...specificData };
          // Compatibilité ascendante : l'ancien laboratoire 'wessling' est devenu 'als_france'.
          if (formData.sampleManagement?.laboratory === 'wessling') {
            formData.sampleManagement = { ...formData.sampleManagement, laboratory: 'als_france' };
          }
          reset(formData as SurfaceWaterSurveyFormData);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la fiche eau de surface:', err);
        showToast('warning', 'Impossible de charger toutes les données de la fiche.');
      }
    };

    void loadSurveyData();
  }, [isEditMode, surveyId, reset, showToast]);

  // Hook pour gérer la soumission
  const { submitForm, loading, error } = useSurveySubmit({
    surveyType: 'surface_water',
    handleSubmit,
    photoFiles,
    isEditMode,
    surveyId,
  });

  return (
    <FormPageLayout 
      siteId={siteId!} 
      title="Prélèvement d'échantillons d'eaux superficielles"
      subtitle="Enregistrement des données de prélèvement d'eaux superficielles"
    >
      <DevelopmentBanner className="mb-6" />
      <form onSubmit={submitForm} className="space-y-8">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="glass-panel p-6 rounded-xl">
          <label>Nom du prélèvement</label>
          <input type="text" {...register('name')} className="input-field" />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>Heure</label>
              <input type="time" {...register('generalInfo.time')} className="input-field" />
              {errors.generalInfo?.time && <p className="text-sm text-red-600 mt-1">{errors.generalInfo.time.message}</p>}
            </div>
            <div>
              <label>Date</label>
              <input type="date" {...register('generalInfo.date')} className="input-field" />
              {errors.generalInfo?.date && <p className="text-sm text-red-600 mt-1">{errors.generalInfo.date.message}</p>}
            </div>
            <div>
              <label>T° air (°C)</label>
              <input type="number" step="0.1" {...register('generalInfo.airTemperature')} className="input-field" />
            </div>
            <div>
              <label>Condition météo</label>
              <select {...register('generalInfo.weatherCondition')} className="input-field">
                {WEATHER_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Localisation</h2>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Coordonnées GPS</h3>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { lat, lng, alt } = await getPosition();
                  setValue('location.y', lat);
                  setValue('location.x', lng);
                  if (alt !== null && alt !== undefined) {
                    setValue('location.z', alt);
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div><label>X</label><input type="text" {...register('location.x')} className="input-field" /></div>
            <div><label>Y</label><input type="text" {...register('location.y')} className="input-field" /></div>
            <div><label>Z (m)</label><input type="text" {...register('location.z')} className="input-field" /></div>
          </div>
          <div className="mt-6">
            <label>Lieu de repère (optionnel)</label>
            <input type="text" {...register('location.landmark')} className="input-field" placeholder="Ex: Pont aval, borne incendie, angle de bâtiment" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Photos du point de prélèvement</h2>
          <PhotoUploadZone onPhotoUpload={handlePhotoUpload} />
          <PhotoUploadPreview 
            photoPreviews={photoPreviews}
            uploadProgress={uploadProgress}
            onDelete={handleDeletePhoto}
          />
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Condition de prélèvement</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label>Type de prélèvement</label>
              <select {...register('sampling.type')} className="input-field">
                {SAMPLING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label>Matériel</label>
              <select {...register('sampling.equipment')} className="input-field">
                {SAMPLING_EQUIPMENT.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label>Profondeur (m)</label>
              <input type="number" step="0.1" {...register('sampling.depth')} className="input-field" />
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Description de la station de prélèvement</h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label>Description du point d'échantillonnage</label>
              <textarea {...register('stationDescription.description')} rows={3} className="input-field" />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div><label>Type d'eau</label><select {...register('stationDescription.waterType')} className="input-field">{WATER_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}</select></div>
              <div><label>Débit estimé</label><select {...register('stationDescription.estimatedFlow')} className="input-field">{FLOW_RATES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
              <div><label>Type d'écoulement</label><select {...register('stationDescription.flowType')} className="input-field">{FLOW_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
              <div><label>Observations</label><textarea {...register('stationDescription.observations')} rows={3} className="input-field" /></div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Observation de terrain</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div><label>Turbidité</label><select {...register('fieldObservations.turbidity')} className="input-field">{TURBIDITY_LEVELS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label>Couleur de l'eau</label><input type="text" {...register('fieldObservations.waterColor')} className="input-field" /></div>
            <div><label>Odeur de l'eau</label><input type="text" {...register('fieldObservations.waterOdor')} className="input-field" /></div>
            <div className="space-y-2 pt-6">
              <div className="flex items-center gap-2"><input type="checkbox" {...register('fieldObservations.hasLeavesMoss')} className="h-4 w-4 rounded" /><label className="text-sm text-foreground dark:text-white">Présence de feuilles, mousses</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" {...register('fieldObservations.hasFloating')} className="h-4 w-4 rounded" /><label className="text-sm text-foreground dark:text-white">Présence de flottants</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" {...register('fieldObservations.hasShade')} className="h-4 w-4 rounded" /><label className="text-sm text-foreground dark:text-white">Ombrage</label></div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Paramètres à contrôler</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr><th className="th-cell">Paramètre</th><th className="th-cell">Début</th><th className="th-cell">Intermédiaire</th><th className="th-cell">Fin</th></tr></thead>
              <tbody>
                <tr><td>Heure</td><td><input type="time" {...register('parameters.time.start')} className="input-field-table" /></td><td><input type="time" {...register('parameters.time.intermediate')} className="input-field-table" /></td><td><input type="time" {...register('parameters.time.end')} className="input-field-table" /></td></tr>
                <tr><td>T°C</td><td><input type="number" step="0.1" {...register('parameters.temperature.start')} className="input-field-table" /></td><td><input type="number" step="0.1" {...register('parameters.temperature.intermediate')} className="input-field-table" /></td><td><input type="number" step="0.1" {...register('parameters.temperature.end')} className="input-field-table" /></td></tr>
                <tr><td>Conductivité (µS/cm)</td><td><input type="number" {...register('parameters.conductivity.start')} className="input-field-table" /></td><td><input type="number" {...register('parameters.conductivity.intermediate')} className="input-field-table" /></td><td><input type="number" {...register('parameters.conductivity.end')} className="input-field-table" /></td></tr>
                <tr><td>pH</td><td><input type="number" step="0.1" {...register('parameters.ph.start')} className="input-field-table" /></td><td><input type="number" step="0.1" {...register('parameters.ph.intermediate')} className="input-field-table" /></td><td><input type="number" step="0.1" {...register('parameters.ph.end')} className="input-field-table" /></td></tr>
                <tr><td>Redox (mV)</td><td><input type="number" {...register('parameters.redox.start')} className="input-field-table" /></td><td><input type="number" {...register('parameters.redox.intermediate')} className="input-field-table" /></td><td><input type="number" {...register('parameters.redox.end')} className="input-field-table" /></td></tr>
                <tr><td>Remarque</td><td><input type="text" {...register('parameters.remarks.start')} className="input-field-table" /></td><td><input type="text" {...register('parameters.remarks.intermediate')} className="input-field-table" /></td><td><input type="text" {...register('parameters.remarks.end')} className="input-field-table" /></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Gestion des échantillons</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div><label>Conditionnement/T°C</label><input type="text" {...register('sampleManagement.conditioning')} className="input-field" /></div>
            <div><label>Laboratoire</label><select {...register('sampleManagement.laboratory')} className="input-field">{LABORATORIES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
            <div><label>Transporteur</label><input type="text" {...register('sampleManagement.transporter')} className="input-field" /></div>
            <div><label>Date d'envoi</label><input type="date" {...register('sampleManagement.shippingDate')} className="input-field" /></div>
          </div>
        </div>

        <div className="flex justify-center sm:justify-end items-start pt-8">
          <SubmitButton 
            loading={loading}
            loadingText="Enregistrement..."
            defaultText="Enregistrer"
            className="w-full sm:w-auto"
          />
        </div>
      </form>
    </FormPageLayout>
  );
}