import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { useSurveyPhotos } from '../../hooks/useSurveyPhotos';
import { useSurveySubmit } from '../../hooks/useSurveySubmit';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { TapWaterSurveySchema, type TapWaterSurvey } from '../../schema/tapWaterSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { PhotoUploadZone } from '../../components/forms/PhotoUploadZone';
import { PhotoUploadPreview } from '../../components/forms/PhotoUploadPreview';
import { getLocalDateString } from '../../lib/utils';

const FREQUENCY_OPTIONS = [
  { value: 'Journalier', label: 'Journalier' },
  { value: 'Hebdomadaire', label: 'Hebdomadaire' },
  { value: 'Mensuel', label: 'Mensuel' },
  { value: 'Annuel', label: 'Annuel' }
] as const;

const POPULATION_SIZE_OPTIONS = [
  { value: '<10', label: '< 10 personnes' },
  { value: '>10', label: '> 10 personnes' },
  { value: '>50', label: '> 50 personnes' },
  { value: '>100', label: '> 100 personnes' }
] as const;

const PIPE_TYPE_OPTIONS = [
  { value: 'Cuivre', label: 'Cuivre' },
  { value: 'Plomb', label: 'Plomb' },
  { value: 'Multicouche', label: 'Multicouche' },
  { value: 'PVC', label: 'PVC' },
  { value: 'Autre', label: 'Autre' }
] as const;

const PURGE_OPTIONS = [
  { value: 'Oui (analyse eau qualité)', label: 'Oui (analyse eau qualité)' },
  { value: 'Non (analyse eau canalisation)', label: 'Non (analyse eau canalisation)' }
] as const;

export function TapWaterSurveyForm() {
  const { siteId, surveyId } = useParams();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { siteData } = useSiteDataForSurvey(siteId);
  const {
    photoFiles,
    photoPreviews,
    uploadProgress,
    handlePhotoUpload,
    handleDeletePhoto,
  } = useSurveyPhotos({ maxSizeMB: 10 });
  const { showToast } = useToast();

  const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm<TapWaterSurvey>({
    resolver: zodResolver(TapWaterSurveySchema),
    defaultValues: {
      nom_prelevement: '',
      date: getLocalDateString(),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      photos: [],
    }
  });

  const { submitForm, loading, error } = useSurveySubmit<TapWaterSurvey>({
    surveyType: 'tap_water',
    handleSubmit,
    photoFiles,
    isEditMode,
    surveyId,
    draftId,
    photoFieldPath: 'photos',
  });
  const { getPosition, isLoading: isGeolocating } = useGeolocation();

  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as TapWaterSurvey);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des données:', error);
        }
      };

      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData]);

  const pipeType = watch('point_prelevement.type_canalisation');

  return (
    <FormPageLayout
      title="Fiche de prélèvement des eaux du robinet"
      subtitle="Prélèvement d'échantillons d'eaux du robinet"
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

        {/* Informations générales */}
        <FormSection title="Informations générales" sectionNumber={1}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="nom_prelevement"
              label="Nom du prélèvement"
              errors={errors}
              isRequired
            />
            <InputField
              register={register}
              name="date"
              label="Date"
              type="date"
              errors={errors}
            />
            <InputField
              register={register}
              name="heure"
              label="Heure"
              type="time"
              errors={errors}
            />
            <InputField
              register={register}
              name="operateur"
              label="Opérateur"
              errors={errors}
            />
            <div className="sm:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Coordonnées GPS</h3>
                <button
                  type="button"
                  onClick={async () => {
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
                <InputField
                  register={register}
                  name="longitude"
                  label="Longitude"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="latitude"
                  label="Latitude"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="altitude"
                  label="Altitude"
                  errors={errors}
                />
              </div>
              <div className="mt-4">
                <InputField
                  register={register}
                  name="lieu_repere"
                  label="Lieu de repère (optionnel)"
                  errors={errors}
                  placeholder="Ex: Cuisine RDC, évier côté fenêtre"
                />
              </div>
            </div>
            <InputField
              register={register}
              name="meteo"
              label="Météo"
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Environnement */}
        <FormSection title="Environnement" sectionNumber={2}>
          <div className="grid grid-cols-1 gap-6">
            <InputField
              register={register}
              name="environnement.usage_batiment"
              label="Usage du bâtiment"
              errors={errors}
            />
            <InputField
              register={register}
              name="environnement.derniere_utilisation"
              label="Dernière utilisation"
              errors={errors}
            />
            <SelectField
              register={register}
              name="environnement.frequence_utilisation"
              label="Fréquence d'utilisation"
              options={FREQUENCY_OPTIONS}
              errors={errors}
            />
            
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-2">Population concernée</label>
              <div className="space-y-2">
                <CheckboxField
                  register={register}
                  name="environnement.population_concernee.enfants"
                  label="Enfants"
                  errors={errors}
                />
                <CheckboxField
                  register={register}
                  name="environnement.population_concernee.adultes"
                  label="Adultes"
                  errors={errors}
                />
                <CheckboxField
                  register={register}
                  name="environnement.population_concernee.employes"
                  label="Employés"
                  errors={errors}
                />
                <CheckboxField
                  register={register}
                  name="environnement.population_concernee.autres"
                  label="Autres"
                  errors={errors}
                />
              </div>
            </div>

            <SelectField
              register={register}
              name="environnement.nombre_personnes"
              label="Nombre de personnes"
              options={POPULATION_SIZE_OPTIONS}
              errors={errors}
            />

            <TextareaField
              register={register}
              name="environnement.observations"
              label="Observations"
              rows={3}
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Point de prélèvement */}
        <FormSection title="Point de prélèvement" sectionNumber={3}>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InputField
                register={register}
                name="point_prelevement.age_batiment"
                label="Âge du bâtiment"
                errors={errors}
              />
              <InputField
                register={register}
                name="point_prelevement.temp_air"
                label="Température air (°C)"
                errors={errors}
              />
            </div>

            <SelectField
              register={register}
              name="point_prelevement.type_canalisation"
              label="Type de canalisation"
              options={PIPE_TYPE_OPTIONS}
              errors={errors}
            />

            {pipeType === 'Autre' && (
              <InputField
                register={register}
                name="point_prelevement.type_canalisation_autre"
                label="Préciser le type de canalisation"
                errors={errors}
              />
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InputField
                register={register}
                name="point_prelevement.travaux_canalisations"
                label="Travaux sur canalisations"
                errors={errors}
              />
              <InputField
                register={register}
                name="point_prelevement.travaux_alentours"
                label="Travaux aux alentours"
                errors={errors}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-2">PID ambiant</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InputField
                  register={register}
                  name="point_prelevement.pid_ambiant.avant_purge"
                  label="Avant purge"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="point_prelevement.pid_ambiant.pendant_purge"
                  label="Pendant purge"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="point_prelevement.pid_ambiant.apres_purge"
                  label="Après purge"
                  errors={errors}
                />
              </div>
            </div>

            <TextareaField
              register={register}
              name="point_prelevement.observations"
              label="Observations"
              rows={3}
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Échantillonnage */}
        <FormSection title="Échantillonnage" sectionNumber={4}>
          <div className="grid grid-cols-1 gap-6">
            <SelectField
              register={register}
              name="echantillonnage.purge_realisee"
              label="Purge réalisée"
              options={PURGE_OPTIONS}
              errors={errors}
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <InputField
                register={register}
                name="echantillonnage.duree_purge_max"
                label="Durée purge max (min)"
                errors={errors}
              />
              <InputField
                register={register}
                name="echantillonnage.duree_purge_moyen"
                label="Durée purge moyen (min)"
                errors={errors}
              />
              <InputField
                register={register}
                name="echantillonnage.volume_purge_estime"
                label="Volume purge estimé (L)"
                errors={errors}
              />
            </div>
          </div>
        </FormSection>

        {/* Paramètres */}
        <FormSection title="Paramètres" sectionNumber={5}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-surface-200 dark:bg-surface-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Paramètre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">En cours de purge</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider">Prélèvement</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-white/10">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Heure</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="time" {...register('parametres.heure.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="time" {...register('parametres.heure.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Température (°C)</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.temp.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.temp.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">pH</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.ph.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.ph.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Conductivité (µS/cm)</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.conductivite.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.conductivite.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Redox (mV)</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.redox.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.redox.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Irisations</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.irisations.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.irisations.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Odeur</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.odeur.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.odeur.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Couleur</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.couleur.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.couleur.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Matières en suspension</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.matieres_suspension.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.matieres_suspension.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">Remarque</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.remarque.en_cours_de_purge')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="text" {...register('parametres.remarque.prelevement')} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#34519e] focus:ring-[#34519e] sm:text-sm" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FormSection>

        {/* PID */}
        <FormSection title="PID" sectionNumber={6}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="pid.premier_jet"
              label="Premier jet"
              errors={errors}
            />
            <InputField
              register={register}
              name="pid.pendant"
              label="Pendant"
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Gestion des échantillons */}
        <FormSection title="Gestion des échantillons" sectionNumber={7}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="gestion_echantillons.conditionnement"
              label="Conditionnement"
              errors={errors}
            />
            <InputField
              register={register}
              name="gestion_echantillons.date_envoi"
              label="Date d'envoi"
              type="date"
              errors={errors}
            />
            <InputField
              register={register}
              name="gestion_echantillons.nom_laboratoire"
              label="Nom du laboratoire"
              errors={errors}
            />
            <InputField
              register={register}
              name="gestion_echantillons.transporteur"
              label="Transporteur"
              errors={errors}
            />
            <div className="sm:col-span-2">
              <TextareaField
                register={register}
                name="gestion_echantillons.substances_recherchees"
                label="Substances recherchées"
                rows={3}
                errors={errors}
              />
            </div>
          </div>
        </FormSection>

        {/* Photos */}
        <FormSection title="Photos du point de prélèvement" sectionNumber={8}>
          <PhotoUploadZone onPhotoUpload={handlePhotoUpload} />
          <PhotoUploadPreview
            photoPreviews={photoPreviews}
            uploadProgress={uploadProgress}
            onDelete={handleDeletePhoto}
          />
        </FormSection>

        <div className="flex justify-center sm:justify-end items-start pt-8">
          <SubmitButton loading={loading} className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3" />
        </div>
      </form>
    </FormPageLayout>
  );
}
