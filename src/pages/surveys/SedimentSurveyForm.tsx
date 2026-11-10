import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Trash2, Plus, ArrowLeft, MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSurveyPhotos } from '../../hooks/useSurveyPhotos';
import { useSurveySubmit } from '../../hooks/useSurveySubmit';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { SedimentSurveySchema, type SedimentSurvey } from '../../schema/sedimentSurveySchema';
import { PhotoUploadZone } from '../../components/forms/PhotoUploadZone';
import { PhotoUploadPreview } from '../../components/forms/PhotoUploadPreview';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { getLocalDateString } from '../../lib/utils';

const WATER_TYPES = [
  { value: 'Fleuve', label: 'Fleuve' },
  { value: 'Cours d\'eau', label: 'Cours d\'eau' },
  { value: 'Ruisseau', label: 'Ruisseau' },
  { value: 'Lac', label: 'Lac' },
  { value: 'Etang', label: 'Étang' },
  { value: 'Bassin', label: 'Bassin' }
] as const;

const POSITION_TYPES = [
  { value: 'Berge', label: 'Berge' },
  { value: 'Milieu du lit', label: 'Milieu du lit' },
  { value: 'Amont', label: 'Amont' },
  { value: 'Aval', label: 'Aval' },
  { value: 'Autre', label: 'Autre' }
] as const;

const MATERIAL_TYPES = [
  { value: 'Seau', label: 'Seau' },
  { value: 'Canne de prélèvement', label: 'Canne de prélèvement' },
  { value: 'Flacon', label: 'Flacon' }
] as const;

const SAMPLING_POSITIONS = [
  { value: 'Depuis la rive', label: 'Depuis la rive' },
  { value: 'A pied', label: 'À pied' },
  { value: 'Depuis un pont', label: 'Depuis un pont' },
  { value: 'Depuis une embarcation', label: 'Depuis une embarcation' },
  { value: 'Autre', label: 'Autre' }
] as const;

const SAMPLING_TYPES = [
  { value: 'Ponctuel', label: 'Ponctuel' },
  { value: 'Composite', label: 'Composite' },
  { value: 'Autre', label: 'Autre' }
] as const;

export function SedimentSurveyForm() {
  const { siteId, surveyId } = useParams();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const {
    photoFiles,
    photoPreviews,
    uploadProgress,
    handlePhotoUpload,
    handleDeletePhoto,
  } = useSurveyPhotos({ maxSizeMB: 10 });
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();

  const { register, handleSubmit, control, formState: { errors }, watch, setValue, reset } = useForm<SedimentSurvey>({
    resolver: zodResolver(SedimentSurveySchema),
    defaultValues: {
      date: getLocalDateString(),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      photos: [],
      lithologie: [{ profondeur: '', lithologie: '', pid: '', organoleptiques: '', echantillon: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lithologie'
  });

  useEffect(() => {
    if (!isEditMode || !surveyId) return;

    const loadSurveyData = async () => {
      try {
        const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
        if (specificData) {
          reset(specificData as SedimentSurvey);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la fiche sédiment:', err);
        showToast('warning', 'Impossible de charger toutes les données de la fiche.');
      }
    };

    void loadSurveyData();
  }, [isEditMode, surveyId, reset, showToast]);

  const { submitForm, loading, error } = useSurveySubmit<SedimentSurvey>({
    surveyType: 'sediment',
    handleSubmit,
    photoFiles,
    isEditMode,
    surveyId,
    draftId,
    photoFieldPath: 'photos',
  });

  const handleGeolocate = async () => {
    try {
      const { lat, lng, alt } = await getPosition();
      setValue('latitude', lat.toString());
      setValue('longitude', lng.toString());
      if (alt !== null && alt !== undefined) {
        setValue('altitude', alt.toString());
      }
      showToast('success', 'Coordonnées remplies avec succès !');
    } catch (err: any) {
      showToast('warning', err.message || 'Géolocalisation indisponible. Saisie manuelle possible.', 6000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link 
              to={`/sites/${siteId}`} 
              className="w-10 h-10 rounded-full glass-panel shadow-md hover:shadow-lg flex items-center justify-center text-foreground hover:text-primary transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Fiche de prélèvement des sédiments</h1>
              <p className="text-muted-foreground mt-1">Enregistrement des données de prélèvement de sédiments</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              En ligne
            </div>
          </div>
        </div>

        <DevelopmentBanner className="mb-6" />

        <form onSubmit={submitForm} className="space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

        {/* Informations générales */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>Nom du prélèvement</label>
              <input type="text" {...register('nom_prelevement')} className="input-field" />
              {errors.nom_prelevement && <p className="text-sm text-red-600 mt-1">{errors.nom_prelevement.message}</p>}
            </div>
            <div>
              <label>Date</label>
              <input type="date" {...register('date')} className="input-field" />
              {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label>Heure</label>
              <input type="time" {...register('heure')} className="input-field" />
              {errors.heure && <p className="text-sm text-red-600 mt-1">{errors.heure.message}</p>}
            </div>
            <div>
              <label>Opérateur</label>
              <input type="text" {...register('operateur')} className="input-field" />
              {errors.operateur && <p className="text-sm text-red-600 mt-1">{errors.operateur.message}</p>}
            </div>
            <div>
              <label>Météo</label>
              <input type="text" {...register('meteo')} className="input-field" />
              {errors.meteo && <p className="text-sm text-red-600 mt-1">{errors.meteo.message}</p>}
            </div>
            <div>
              <label>Météo des jours précédents</label>
              <input type="text" {...register('meteo_jours_precedents')} className="input-field" />
              {errors.meteo_jours_precedents && <p className="text-sm text-red-600 mt-1">{errors.meteo_jours_precedents.message}</p>}
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Localisation</h2>
            <button
              type="button"
              onClick={handleGeolocate}
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
            <div>
              <label>Longitude</label>
              <input type="text" {...register('longitude')} className="input-field" />
              {errors.longitude && <p className="text-sm text-red-600 mt-1">{errors.longitude.message}</p>}
            </div>
            <div>
              <label>Latitude</label>
              <input type="text" {...register('latitude')} className="input-field" />
              {errors.latitude && <p className="text-sm text-red-600 mt-1">{errors.latitude.message}</p>}
            </div>
            <div>
              <label>Altitude (m)</label>
              <input type="text" {...register('altitude')} className="input-field" />
              {errors.altitude && <p className="text-sm text-red-600 mt-1">{errors.altitude.message}</p>}
            </div>
          </div>
        </div>

        {/* Station de prélèvement */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Station de prélèvement</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>Type d'eau superficielle</label>
              <select {...register('station_prelevement.type_eau_superficielle')} className="input-field">
                <option value="">Sélectionner...</option>
                {WATER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.station_prelevement?.type_eau_superficielle && <p className="text-sm text-red-600 mt-1">{errors.station_prelevement.type_eau_superficielle.message}</p>}
            </div>
            <div>
              <label>Position du prélèvement</label>
              <select {...register('station_prelevement.position_prelevement')} className="input-field">
                <option value="">Sélectionner...</option>
                {POSITION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.station_prelevement?.position_prelevement && <p className="text-sm text-red-600 mt-1">{errors.station_prelevement.position_prelevement.message}</p>}
            </div>
          </div>
        </div>

        {/* Échantillonnage */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Échantillonnage</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>Matériel</label>
              <select {...register('echantillonnage.materiel')} className="input-field">
                <option value="">Sélectionner...</option>
                {MATERIAL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.echantillonnage?.materiel && <p className="text-sm text-red-600 mt-1">{errors.echantillonnage.materiel.message}</p>}
            </div>
            <div>
              <label>Position</label>
              <select {...register('echantillonnage.position')} className="input-field">
                <option value="">Sélectionner...</option>
                {SAMPLING_POSITIONS.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.echantillonnage?.position && <p className="text-sm text-red-600 mt-1">{errors.echantillonnage.position.message}</p>}
            </div>
            <div>
              <label>Profondeur (m)</label>
              <input type="text" {...register('echantillonnage.profondeur')} className="input-field" />
              {errors.echantillonnage?.profondeur && <p className="text-sm text-red-600 mt-1">{errors.echantillonnage.profondeur.message}</p>}
            </div>
            <div>
              <label>Type</label>
              <select {...register('echantillonnage.type')} className="input-field">
                <option value="">Sélectionner...</option>
                {SAMPLING_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.echantillonnage?.type && <p className="text-sm text-red-600 mt-1">{errors.echantillonnage.type.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label>Remarques</label>
              <textarea {...register('echantillonnage.remarques')} rows={3} className="input-field" />
              {errors.echantillonnage?.remarques && <p className="text-sm text-red-600 mt-1">{errors.echantillonnage.remarques.message}</p>}
            </div>
          </div>
        </div>

        {/* Lithologie */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-foreground">Lithologie</h2>
            <button
              type="button"
              onClick={() => append({ profondeur: '', lithologie: '', pid: '', organoleptiques: '', echantillon: '' })}
              className="btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une entrée
            </button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-foreground">Entrée {index + 1}</h3>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label>Profondeur (m)</label>
                  <input type="text" {...register(`lithologie.${index}.profondeur`)} className="input-field" />
                  {errors.lithologie?.[index]?.profondeur && <p className="text-sm text-red-600 mt-1">{errors.lithologie[index]?.profondeur?.message}</p>}
                </div>
                <div>
                  <label>Lithologie</label>
                  <input type="text" {...register(`lithologie.${index}.lithologie`)} className="input-field" />
                  {errors.lithologie?.[index]?.lithologie && <p className="text-sm text-red-600 mt-1">{errors.lithologie[index]?.lithologie?.message}</p>}
                </div>
                <div>
                  <label>PID</label>
                  <input type="text" {...register(`lithologie.${index}.pid`)} className="input-field" />
                  {errors.lithologie?.[index]?.pid && <p className="text-sm text-red-600 mt-1">{errors.lithologie[index]?.pid?.message}</p>}
                </div>
                <div>
                  <label>Organoleptiques</label>
                  <input type="text" {...register(`lithologie.${index}.organoleptiques`)} className="input-field" />
                  {errors.lithologie?.[index]?.organoleptiques && <p className="text-sm text-red-600 mt-1">{errors.lithologie[index]?.organoleptiques?.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label>Échantillon</label>
                  <input type="text" {...register(`lithologie.${index}.echantillon`)} className="input-field" />
                  {errors.lithologie?.[index]?.echantillon && <p className="text-sm text-red-600 mt-1">{errors.lithologie[index]?.echantillon?.message}</p>}
                </div>
              </div>
            </div>
          ))}
          {errors.lithologie && <p className="text-sm text-red-600 mt-1">{errors.lithologie.message}</p>}
        </div>

        {/* Paramètres */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>pH</label>
              <input type="text" {...register('parametres.ph')} className="input-field" />
              {errors.parametres?.ph && <p className="text-sm text-red-600 mt-1">{errors.parametres.ph.message}</p>}
            </div>
            <div>
              <label>Couleur</label>
              <input type="text" {...register('parametres.couleur')} className="input-field" />
              {errors.parametres?.couleur && <p className="text-sm text-red-600 mt-1">{errors.parametres.couleur.message}</p>}
            </div>
            <div>
              <label>Température (°C)</label>
              <input type="text" {...register('parametres.temp')} className="input-field" />
              {errors.parametres?.temp && <p className="text-sm text-red-600 mt-1">{errors.parametres.temp.message}</p>}
            </div>
            <div>
              <label>PID</label>
              <input type="text" {...register('parametres.pid')} className="input-field" />
              {errors.parametres?.pid && <p className="text-sm text-red-600 mt-1">{errors.parametres.pid.message}</p>}
            </div>
            <div>
              <label>Conductivité</label>
              <input type="text" {...register('parametres.conductivite')} className="input-field" />
              {errors.parametres?.conductivite && <p className="text-sm text-red-600 mt-1">{errors.parametres.conductivite.message}</p>}
            </div>
            <div>
              <label>Irisation</label>
              <input type="text" {...register('parametres.irisation')} className="input-field" />
              {errors.parametres?.irisation && <p className="text-sm text-red-600 mt-1">{errors.parametres.irisation.message}</p>}
            </div>
            <div>
              <label>Redox (mV)</label>
              <input type="text" {...register('parametres.redox')} className="input-field" />
              {errors.parametres?.redox && <p className="text-sm text-red-600 mt-1">{errors.parametres.redox.message}</p>}
            </div>
            <div>
              <label>Odeur</label>
              <input type="text" {...register('parametres.odeur')} className="input-field" />
              {errors.parametres?.odeur && <p className="text-sm text-red-600 mt-1">{errors.parametres.odeur.message}</p>}
            </div>
            <div>
              <label>Présence d'organismes</label>
              <input type="text" {...register('parametres.presence_organismes')} className="input-field" />
              {errors.parametres?.presence_organismes && <p className="text-sm text-red-600 mt-1">{errors.parametres.presence_organismes.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label>Remarques</label>
              <textarea {...register('parametres.remarques')} rows={3} className="input-field" />
              {errors.parametres?.remarques && <p className="text-sm text-red-600 mt-1">{errors.parametres.remarques.message}</p>}
            </div>
          </div>
        </div>

        {/* Gestion des échantillons */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Gestion des échantillons</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label>Conditionnement</label>
              <input type="text" {...register('gestion_echantillons.conditionnement')} className="input-field" />
              {errors.gestion_echantillons?.conditionnement && <p className="text-sm text-red-600 mt-1">{errors.gestion_echantillons.conditionnement.message}</p>}
            </div>
            <div>
              <label>Date d'envoi</label>
              <input type="date" {...register('gestion_echantillons.date_envoi')} className="input-field" />
              {errors.gestion_echantillons?.date_envoi && <p className="text-sm text-red-600 mt-1">{errors.gestion_echantillons.date_envoi.message}</p>}
            </div>
            <div>
              <label>Nom du laboratoire</label>
              <input type="text" {...register('gestion_echantillons.nom_laboratoire')} className="input-field" />
              {errors.gestion_echantillons?.nom_laboratoire && <p className="text-sm text-red-600 mt-1">{errors.gestion_echantillons.nom_laboratoire.message}</p>}
            </div>
            <div>
              <label>Transporteur</label>
              <input type="text" {...register('gestion_echantillons.transporteur')} className="input-field" />
              {errors.gestion_echantillons?.transporteur && <p className="text-sm text-red-600 mt-1">{errors.gestion_echantillons.transporteur.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label>Substances recherchées</label>
              <textarea {...register('gestion_echantillons.substances_recherchees')} rows={3} className="input-field" />
              {errors.gestion_echantillons?.substances_recherchees && <p className="text-sm text-red-600 mt-1">{errors.gestion_echantillons.substances_recherchees.message}</p>}
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-medium text-foreground mb-4">Photos du point de prélèvement</h2>
          <PhotoUploadZone onPhotoUpload={handlePhotoUpload} />
          <PhotoUploadPreview
            photoPreviews={photoPreviews}
            uploadProgress={uploadProgress}
            onDelete={handleDeletePhoto}
          />
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
      </div>
    </div>
  );
}
