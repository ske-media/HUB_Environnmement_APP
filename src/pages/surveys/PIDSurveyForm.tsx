import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2, Building2, Cloud, FileText, Sun, CloudRain, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { withPreservedUserSelection } from '../../lib/constants/allowedFieldUsers';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { PIDSurveySchema, type PIDSurveyFormData } from '../../schema/pidSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSidebar } from '../../components/forms/FormSidebar';
import { FormSection } from '../../components/forms/FormSection';
import { RadioCardField } from '../../components/forms/fields/RadioCardField';
import { InputField } from '../../components/forms/fields/InputField';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { Button } from '../../components/ui/Button';
import { getLocalDateString } from '../../lib/utils';

export function PIDSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);
  const { showToast } = useToast();
  const { data: preleveurs = [] } = useUsers({
    includeHistoricalPreleveurs: true,
    restrictToAllowedFieldUsers: true,
  });
  const { isDesktop } = useDeviceContext();
  const { generatePdf, isGenerating } = usePdfGenerator();

  const { register, handleSubmit, control, formState: { errors, isDirty }, reset, watch, setValue } = useForm<PIDSurveyFormData>({
    resolver: zodResolver(PIDSurveySchema),
    defaultValues: {
      date: getLocalDateString(),
      numero_affaire: '',
      client: '',
      commune: '',
      preleveur: '',
      measurements: [{ location: '', pid: '', o2: '', h2s: '', ch4: '', co: '', remarque: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "measurements"
  });


  // Pré-remplir les champs depuis les données du site (cohérence métier).
  useEffect(() => {
    if (!siteData) return;
    if (siteData.project_number) setValue('numero_affaire', siteData.project_number);
    if (siteData.name) setValue('client', siteData.name);
    if (siteData.city) setValue('commune', siteData.city);
  }, [siteData, setValue]);

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
            if (siteData?.project_number) {
              formData.numero_affaire = siteData.project_number;
            }
            if (siteData?.name) {
              formData.client = siteData.name;
            }
            if (siteData?.city) {
              formData.commune = siteData.city;
            }
            // Si preleveur n'existe pas, laisser vide (sera rempli par l'utilisateur)
            if (!formData.preleveur) {
              formData.preleveur = '';
            }
            
            // Supprimer les anciens champs qui n'existent plus dans le schéma
            delete formData.structureDescription;
            delete formData.reference_dossier;
            delete formData.coordinates;
            
            reset(formData as PIDSurveyFormData);
          }
        } catch (err: any) {
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      loadSurveyData();
    }
  }, [isEditMode, surveyId, siteId, reset, siteData]);

  const sections = [
    { id: 'section-informations', number: 1, title: 'Informations générales', icon: Building2 },
    { id: 'section-meteo', number: 2, title: 'Conditions météorologiques', icon: Cloud },
    { id: 'section-mesures', number: 3, title: 'Mesures semi-quantitatives des gaz du sol', icon: FileText },
  ];

  const onSubmitInternal = async (formData: PIDSurveyFormData, shouldNavigate = true) => {
    setLoading(true);
    setError('');
    try {
      delete (formData as any).coordinates;

      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'pid',
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
      
      // Réinitialiser isDirty après sauvegarde réussie
      reset(formData, { keepValues: true });
      
      // Naviguer seulement si demandé (pas lors de la génération PDF)
      if (shouldNavigate) {
        navigate(`/sites/${siteId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<PIDSurveyFormData> = async (formData) => {
    return onSubmitInternal(formData, true);
  };

  // Fonction pour sauvegarder et générer le PDF
  const saveAndGeneratePdf = async () => {
    try {
      // Sauvegarder d'abord (sans navigation)
      const formData = watch();
      await onSubmitInternal(formData, false);
      
      // Attendre un peu pour s'assurer que la sauvegarde est terminée
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer le PDF avec les données sauvegardées
      await generatePdf('pid', formData as PIDSurveyFormData, siteData?.name || '', siteId || undefined);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde/génération PDF:', err);
      showToast('error', 'Erreur lors de la sauvegarde ou de la génération du PDF');
    }
  };

  // Protection contre la navigation sans sauvegarde
  // Ne pas bloquer pendant le chargement ou la génération du PDF
  const navigationBlockerDialog = useNavigationBlocker({
    shouldBlock: isDirty && !loading && !isGenerating('pid'),
    message: 'Vous avez des modifications non sauvegardées.',
    onSave: async () => {
      const formData = watch();
      await onSubmitInternal(formData, false);
    },
    isSaving: loading,
  });

  // Protection beforeunload pour quitter la page (fermeture d'onglet/navigateur)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !loading && !isGenerating('pid')) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, loading, isGenerating]);

  const preleveurValue = watch('preleveur');
  const preleveurOptions = withPreservedUserSelection(preleveurs, preleveurValue);

  return (
    <>
      {navigationBlockerDialog}
      <FormPageLayout
        siteId={siteId!}
        title={`${isEditMode ? 'Modifier la' : 'Nouvelle'} Fiche de Campagne PID`}
      subtitle="Enregistrement des mesures PID et gaz du sol"
      sidebar={
        <FormSidebar
          sections={sections}
          loading={loading}
          formId="pid-survey-form"
          onGeneratePdf={saveAndGeneratePdf}
          isGeneratingPdf={isGenerating('pid')}
        />
      }
    >
      <form id="pid-survey-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
        
        {/* SECTION 1 : Informations générales */}
        <FormSection id="section-informations" number={1} title="Informations générales" icon={Building2}>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Date</label>
              <input type="date" {...register("date")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
              {errors.date && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Préleveur</label>
              <select {...register("preleveur")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors">
                <option value="">Sélectionner un préleveur...</option>
                {preleveurOptions.map((preleveur) => (
                  <option key={preleveur} value={preleveur}>
                    {preleveur}
                  </option>
                ))}
              </select>
              {errors.preleveur && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.preleveur.message}</p>}
            </div>
          </div>
        </FormSection>
        
        {/* SECTION 2 : Conditions météorologiques */}
        <FormSection id="section-meteo" number={2} title="Conditions météorologiques" icon={Cloud}>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            <div className="sm:col-span-3">
              <RadioCardField
                name="weatherConditions.description"
                label="Météo"
                register={register}
                watch={watch}
                errors={errors}
                options={[
                  { value: 'Ensoleillé', label: 'Ensoleillé', icon: Sun },
                  { value: 'Nuageux', label: 'Nuageux', icon: Cloud },
                  { value: 'Pluvieux', label: 'Pluvieux', icon: CloudRain },
                ]}
                columns={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">T°C ext</label>
              <input type="number" step="0.1" {...register("weatherConditions.externalTemp")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">T°C int</label>
              <input type="number" step="0.1" {...register("weatherConditions.internalTemp")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Pression (Pa)</label>
              <input type="number" {...register("weatherConditions.pressure")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Humidité (%)</label>
              <input type="number" min="0" max="100" {...register("weatherConditions.humidity")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Vent (vitesse/sens)</label>
              <input type="text" {...register("weatherConditions.windSpeedDirection")} className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors" />
            </div>
          </div>
        </FormSection>
        
        {/* SECTION 3 : Mesures semi-quantitatives */}
        <FormSection 
          id="section-mesures" 
          number={3} 
          title="Mesures semi-quantitatives des gaz du sol" 
          icon={FileText}
          actionButton={
            <button 
              type="button" 
              onClick={() => append({ location: '', pid: '', o2: '', h2s: '', ch4: '', co: '', remarque: '' })} 
              className="inline-flex items-center justify-center px-4 py-2.5 sm:py-2 lg:px-6 lg:py-2.5 text-sm lg:text-base font-medium text-foreground glass-panel border border-white/10 rounded-md hover:bg-white/10 dark:hover:bg-surface-300/20 active:bg-white/20 dark:active:bg-surface-400/30 focus:outline-none focus:ring-2 focus:ring-primary transition-colors min-h-[44px] sm:min-h-0"
            >
              <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-1.5" /> Ajouter une mesure
            </button>
          }
        >
          {errors.measurements?.root && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{errors.measurements.root.message}</p>}
          
          {/* Cartes de mesures - Responsive (mobile et desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {fields.map((field, index) => (
              <div 
                key={field.id} 
                className="glass-panel-lg p-4 sm:p-5 lg:p-6 border border-white/10 rounded-xl space-y-4"
              >
                {/* En-tête de la carte */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Mesure #{index + 1}</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => remove(index)} 
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Supprimer cette mesure"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Champs de la mesure */}
                <div className="space-y-4">
                  {/* Ouvrage/Maille */}
                  <InputField
                    name={`measurements.${index}.location`}
                    label="Ouvrage/Maille"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Piézomètre P1"
                  />

                  {/* Grille des mesures */}
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      name={`measurements.${index}.pid`}
                      label="PID (ppmV)"
                      type="number"
                      step="0.1"
                      register={register}
                      errors={errors}
                      placeholder="0.0"
                    />
                    <InputField
                      name={`measurements.${index}.o2`}
                      label="O2 (%)"
                      type="number"
                      step="0.1"
                      register={register}
                      errors={errors}
                      placeholder="20.9"
                    />
                    <InputField
                      name={`measurements.${index}.h2s`}
                      label="H2S (ppmV)"
                      type="number"
                      step="0.1"
                      register={register}
                      errors={errors}
                      placeholder="0.0"
                    />
                    <InputField
                      name={`measurements.${index}.ch4`}
                      label="CH4 (%)"
                      type="number"
                      step="0.1"
                      register={register}
                      errors={errors}
                      placeholder="0.0"
                    />
                  </div>

                  {/* CO et Remarques sur toute la largeur */}
                  <InputField
                    name={`measurements.${index}.co`}
                    label="CO (ppmV)"
                    type="number"
                    step="0.1"
                    register={register}
                    errors={errors}
                    placeholder="0.0"
                  />
                  <InputField
                    name={`measurements.${index}.remarque`}
                    label="Remarques"
                    register={register}
                    errors={errors}
                    placeholder="Remarques additionnelles..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Message si aucune mesure */}
          {fields.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Aucune mesure ajoutée. Cliquez sur "Ajouter une mesure" pour commencer.</p>
            </div>
          )}

          {/* Bouton d'ajout en bas - apparaît après la 2ème mesure */}
          {fields.length >= 2 && (
            <div className="mt-8 pt-8 border-t-2 border-primary/20">
              <div className="flex justify-center">
                <button 
                  type="button" 
                  onClick={() => {
                    append({ location: '', pid: '', o2: '', h2s: '', ch4: '', co: '', remarque: '' });
                    // Scroll vers le bas après un court délai pour voir la nouvelle mesure
                    setTimeout(() => {
                      const section = document.getElementById('section-mesures');
                      if (section) {
                        section.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }
                    }, 100);
                  }} 
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all transform hover:scale-105 active:scale-95"
                >
                  <Plus className="h-6 w-6 mr-2" /> Ajouter une nouvelle mesure
                </button>
              </div>
            </div>
          )}
        </FormSection>

        {/* Section d'actions en bas du formulaire */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="glass-panel-lg p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={saveAndGeneratePdf}
                  disabled={isGenerating('pid') || loading}
                  className="hidden lg:inline-flex w-full sm:w-auto min-w-[200px]"
                >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating('pid') ? 'Génération...' : 'Télécharger le PDF'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || isGenerating('pid')}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer la fiche'
                )}
              </Button>
            </div>
          </div>
        </div>
        </form>
    </FormPageLayout>
    </>
  );
}