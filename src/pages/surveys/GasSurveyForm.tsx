import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';
import { useForm, SubmitHandler, useFieldArray, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, Trash2, FileText, MapPin, Loader2, Building2, Cloud, Wrench, Droplet, Gauge, Package, Sun, CloudRain, Download, CheckCircle, XCircle, Minus, Layers, Beaker, Calculator, Shield, TestTube, Activity, Zap, Settings, Sliders, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useUsers } from '../../hooks/useUsers';
import { withPreservedUserSelection } from '../../lib/constants/allowedFieldUsers';
import { useToast } from '../../contexts/ToastContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import {
  submitSurveyUpsert,
  isLikelyNetworkError,
  type OfflinePhotoInput,
} from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import {
  GasSurveySchema,
  GAS_TYPE_CONDITIONNEMENT,
  type GasSurveyFormData,
} from '../../schema/gasSurveySchema';
import { getLocalDateString } from '../../lib/utils';
import { PhotoPickerField } from '../../components/forms/PhotoPickerField';
import { SafeSurveyImage } from '../../components/forms/SafeSurveyImage';
import { useSurveyPhotoField } from '../../hooks/useSurveyPhotoField';
import { uploadSurveyPhoto } from '../../lib/photos/surveyPhotoPipeline';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSidebar } from '../../components/forms/FormSidebar';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { RadioCardField } from '../../components/forms/fields/RadioCardField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { YesNoRadioField } from '../../components/forms/fields/YesNoRadioField';
import { Button } from '../../components/ui/Button';

const LABORATOIRE_OPTIONS = [
  { value: 'ALS France', label: 'ALS France', icon: FileText },
  { value: 'Eurofins', label: 'Eurofins', icon: FileText },
  { value: 'Agrolab', label: 'Agrolab', icon: FileText },
] as const;

// --- Composant pour le calcul automatique du volume de la canne-gaz ---
// Formule du cylindre : V = π × r² × h
// où r = diamètre / 2 (en mètres) et h = profondeur (en mètres)
// Conversion : diamètre en mm -> mètres, puis résultat en litres
const AutoCalculatedVolumeCanneGaz = ({ control, setValue }: { control: Control<GasSurveyFormData>, setValue: Function }) => {
  const [profondeur, diametre] = useWatch({
    control,
    name: [
      "ouvrage_canne_gaz.profondeur_m",
      "ouvrage_canne_gaz.diametre_mm"
    ]
  });

  useEffect(() => {
    try {
      // Convertir les valeurs en nombres
      const prof = typeof profondeur === 'number' ? profondeur : (profondeur ? parseFloat(String(profondeur)) : 0);
      const diam = typeof diametre === 'number' ? diametre : (diametre ? parseFloat(String(diametre)) : 0);

      // Vérifier que les valeurs sont valides et positives
      if (!isNaN(prof) && !isNaN(diam) && prof > 0 && diam > 0) {
        // Formule du cylindre : V = π × r² × h
        // 1. Convertir le diamètre de mm en mètres : diam / 1000
        // 2. Calculer le rayon : (diam / 1000) / 2
        const diametreM = diam / 1000; // Conversion mm -> m
        const rayonM = diametreM / 2; // Rayon en mètres
        
        // 3. Calculer le volume en m³ : π × r² × h
        const volumeM3 = Math.PI * Math.pow(rayonM, 2) * prof;
        
        // 4. Convertir en litres : × 1000
        const volumeL = volumeM3 * 1000;
        
        // 5. Arrondir à 3 décimales
        const volumeRounded = Math.round(volumeL * 1000) / 1000;
        
        // Mettre à jour le champ volume
        setValue('ouvrage_canne_gaz.volume_l', volumeRounded, { shouldValidate: false });
      } else {
        // Si les valeurs ne sont pas valides, vider le champ
        setValue('ouvrage_canne_gaz.volume_l', undefined, { shouldValidate: false });
      }
    } catch (error) {
      // En cas d'erreur, vider le champ
      setValue('ouvrage_canne_gaz.volume_l', undefined, { shouldValidate: false });
    }
  }, [profondeur, diametre, setValue]);

  return null;
};

// --- Composant pour les calculs automatiques des prélèvements ---
const AutoCalculatedPrelevementMetrics = ({
  control,
  setValue,
}: {
  control: Control<GasSurveyFormData>;
  setValue: Function;
}) => {
  const prelevements = useWatch({ control, name: 'prelevements' });

  useEffect(() => {
    if (!prelevements || prelevements.length === 0) return;

    const parseTimeToMinutes = (time?: string): number | null => {
      if (!time || typeof time !== 'string') return null;
      const [h, m] = time.split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return h * 60 + m;
    };

    prelevements.forEach((prelevement, index) => {
      const start = parseTimeToMinutes(prelevement?.heure_debut);
      const end = parseTimeToMinutes(prelevement?.heure_fin);

      if (start === null || end === null) {
        if (prelevement?.duree_prelevement_min !== undefined) {
          setValue(`prelevements.${index}.duree_prelevement_min`, undefined, { shouldValidate: false });
        }
        return;
      }

      let duration = end - start;
      // Gérer le cas de passage de minuit.
      if (duration < 0) duration += 24 * 60;

      if (prelevement?.duree_prelevement_min !== duration) {
        setValue(`prelevements.${index}.duree_prelevement_min`, duration, { shouldValidate: false });
      }

      const debitRetenu =
        typeof prelevement?.debit_retenu === 'number'
          ? prelevement.debit_retenu
          : prelevement?.debit_retenu
            ? Number(prelevement.debit_retenu)
            : undefined;

      if (debitRetenu !== undefined && Number.isFinite(debitRetenu) && debitRetenu >= 0) {
        const volume = Math.round(debitRetenu * duration * 1000) / 1000;
        if (prelevement?.volume_preleve_l !== volume) {
          setValue(`prelevements.${index}.volume_preleve_l`, volume, { shouldValidate: false });
        }
      } else if (prelevement?.volume_preleve_l !== undefined) {
        setValue(`prelevements.${index}.volume_preleve_l`, undefined, { shouldValidate: false });
      }
    });
  }, [prelevements, setValue]);

  return null;
};

export function GasSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const visualisationPoint = useSurveyPhotoField();
  const { file: visualisationFile, setPersistedUrl: setVisualisationPersistedUrl } =
    visualisationPoint;

  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();
  const { siteData } = useSiteDataForSurvey(siteId);
  const { data: preleveurs = [] } = useUsers({
    includeHistoricalPreleveurs: true,
    restrictToAllowedFieldUsers: true,
  });
  const { isDesktop } = useDeviceContext();
  const { generatePdf, isGenerating } = usePdfGenerator();

  const { register, handleSubmit, formState: { errors, isDirty }, reset, control, watch, setValue } = useForm<GasSurveyFormData>({
    resolver: zodResolver(GasSurveySchema),
    defaultValues: {
      numero_affaire: '',
      client: '',
      commune: '',
      nom_prelevement: '',
      date: getLocalDateString(),
      preleveur: '',
      localisation: '',
      longitude: '',
      latitude: '',
      altitude: '',
      visualisation_point_prelevement: '',
      pid_ambiant_ppm: undefined,
      nature_revetement: undefined,
      nature_revetement_autre: '',
      etat_revetement: undefined,
      humidite_sol_surface: '',
      profondeur_nappe_msol: undefined,
      nom_piezometre: '',
      meteo: undefined,
      date_dernieres_pluies: getLocalDateString(),
      temperature_air_c: { t0: undefined, tfin: undefined },
      pression_atmospherique_hpa: { t0: undefined, tfin: undefined },
      pluie_durant_mesure: { t0: undefined, tfin: undefined },
      humidite_air_pct: { t0: undefined, tfin: undefined },
      vent_kmh: { t0: undefined, tfin: undefined },
      type_ouvrage: undefined,
      ouvrage_piezair: {
        bouchon_etanche: false,
        profondeur_m: undefined,
        diametre_tubage_interne_mm: undefined,
        volume_l: undefined,
        presence_eau_hauteur_cm: undefined,
        hauteur_cm: undefined,
      },
      ouvrage_sous_dalle: {
        type: 'temporaire',
        epaisseur_dalle_m: undefined,
        profondeur_foration_m: undefined,
        diametre_foration_mm: undefined,
        volume_vide_cree_l: undefined,
        presence_vide_sous_dalle: false,
        etancheite: '',
      },
      ouvrage_canne_gaz: {
        type: 'crepinee',
        profondeur_m: undefined,
        profondeur_crepine_m: undefined,
        diametre_mm: undefined,
        volume_l: undefined,
      },
      etancheite_test: { realise: false, resultat_o2: '' },
      etancheification_sol: { realise: false, type: undefined, bache_couverture_superficie_m2: '', autre_details: '' },
      echantillonnage_type: 'Actif',
      echantillonnage_details: 'Tube adsorption avec pompage',
      echantillonnage_details_autre: '',
      nature_supports: {
        charbon_actif: false,
        xad2: false,
        fluorisil: false,
        carulite: false,
        presence_autre: false,
        autre: '',
      },
      methode_plusieurs_supports: 'une pompe par support',
      details_repartition_flux: '',
      montage: {
        pompe_gilair: false,
        debitmetre_gocal: false,
        filtre_humidite: false,
        filtre_poussieres: false,
        presence_flexibles: false,
        flexible_pehd: false,
        flexible_ptfe: false,
        flexible_pp: false,
        presence_autre: false,
        autre: '',
      },
      identification_blanc: { type: 'Terrain', nom: '' },
      purge_ouvrage: {
        heure_debut: new Date().toTimeString().slice(0, 5),
        debit_purge_lmin: undefined,
        duree_purge_min: undefined,
        volume_purge_l: undefined,
        pid_ppmv: undefined,
        t0: undefined,
        t1: undefined,
        t2: undefined,
        tfin_stabilise: undefined,
      },
      prelevements: [],
      conditionnement_transport: {
        type_conditionnement: GAS_TYPE_CONDITIONNEMENT,
        laboratoire: undefined,
        date_depot: getLocalDateString(),
        transporteur: undefined,
        transporteur_autre: '',
        date_envoi: getLocalDateString(),
      },
      substances_recherchees: {
        tph_c5_c16_btex_cohv_naphtalene: false,
        mercure_volatil: false,
        pcb: false,
        hap: false,
        presence_autre: false,
        autre: '',
      },
    },
  });

  const { fields: prelevementFields, append: appendPrelevement, remove: removePrelevement } = useFieldArray({
    control,
    name: 'prelevements',
  });

  // Ajouter un prélèvement par défaut si aucun n'existe
  useEffect(() => {
    if (prelevementFields.length === 0 && !isEditMode) {
      const currentTime = new Date().toTimeString().slice(0, 5); // Format HH:MM
      appendPrelevement({
        heure_debut: currentTime,
        heure_fin: currentTime,
      });
    }
  }, [prelevementFields.length, appendPrelevement, isEditMode]);

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
          const loadedData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (loadedData) {
            const formData: any = { ...loadedData };

            if (siteData?.project_number) {
              formData.numero_affaire = siteData.project_number;
            }
            if (siteData?.name) {
              formData.client = siteData.name;
            }
            if (siteData?.city) {
              formData.commune = siteData.city;
            }

            // Compatibilité ascendante : l'ancien laboratoire "Wessling" est devenu "ALS France".
            if (formData.conditionnement_transport?.laboratoire === 'Wessling') {
              formData.conditionnement_transport.laboratoire = 'ALS France';
            }
            if (!formData.conditionnement_transport) formData.conditionnement_transport = {};
            formData.conditionnement_transport.type_conditionnement = GAS_TYPE_CONDITIONNEMENT;

            reset(formData as GasSurveyFormData);
          }
        } catch (err: any) {
          console.error("Error loading survey data:", err);
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      loadSurveyData();
    }
  }, [isEditMode, surveyId, siteId, reset, siteData]);

  // Gérer le changement de type d'ouvrage : vider les autres types quand on change
  const typeOuvrage = watch('type_ouvrage');
  useEffect(() => {
    if (typeOuvrage === 'piezair') {
      // Vider les autres types
      setValue('ouvrage_sous_dalle', undefined);
      setValue('ouvrage_canne_gaz', undefined);
    } else if (typeOuvrage === 'sous_dalle') {
      setValue('ouvrage_piezair', undefined);
      setValue('ouvrage_canne_gaz', undefined);
    } else if (typeOuvrage === 'canne_gaz') {
      setValue('ouvrage_piezair', undefined);
      setValue('ouvrage_sous_dalle', undefined);
    }
  }, [typeOuvrage, setValue]);

  const onSubmitInternal = async (formData: GasSurveyFormData, shouldNavigate = true) => {
    setLoading(true);
    setError('');
    try {
      // Téléversement de la photo de visualisation si un nouveau fichier a été
      // sélectionné. Hors ligne, on saute directement à la mise en queue : le
      // binaire est conservé en IndexedDB et rejoué au retour du réseau.
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const photosForQueue: OfflinePhotoInput[] = [];

      if (visualisationPoint.file) {
        let uploaded = false;
        if (!isOffline) {
          try {
            const publicUrl = await uploadSurveyPhoto({
              file: visualisationPoint.file,
              siteId: siteId ?? null,
              surveyType: 'gas',
              fieldSuffix: 'visualisation',
            });
            formData.visualisation_point_prelevement = publicUrl;
            setValue('visualisation_point_prelevement', publicUrl, { shouldValidate: false });
            visualisationPoint.markUploaded(publicUrl);
            uploaded = true;
          } catch (photoErr) {
            if (!isLikelyNetworkError(photoErr)) throw photoErr;
          }
        }

        if (!uploaded) {
          // Le champ reste vide en base ; le rejeu y écrira l'URL publique.
          formData.visualisation_point_prelevement = '';
          photosForQueue.push({
            file: visualisationPoint.file,
            fieldPath: 'visualisation_point_prelevement',
          });
        }
      }
      // Sinon, la valeur existante de visualisation_point_prelevement (mode édition) est préservée.

      if (!formData.conditionnement_transport) formData.conditionnement_transport = {};
      formData.conditionnement_transport.type_conditionnement = GAS_TYPE_CONDITIONNEMENT;

      // S'assurer que les champs requis sont remplis depuis les données du site
      if (siteId) {
        const { data: siteData, error: siteError } = await supabase
          .from('sites')
          .select('project_number, name, city')
          .eq('id', siteId)
          .single();
        
        if (!siteError && siteData) {
          formData.numero_affaire = siteData.project_number || formData.numero_affaire;
          formData.client = siteData.name || formData.client;
          formData.commune = siteData.city || formData.commune;
        }
      }
      
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'gas',
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData: formData,
        photos: photosForQueue,
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

  const onSubmit: SubmitHandler<GasSurveyFormData> = async (formData) => {
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
      await generatePdf('gas', formData as GasSurveyFormData, siteData?.name || '', siteId || undefined);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde/génération PDF:', err);
      showToast('error', 'Erreur lors de la sauvegarde ou de la génération du PDF');
    }
  };

  // Protection contre la navigation sans sauvegarde
  // Ne pas bloquer pendant le chargement ou la génération du PDF
  const navigationBlockerDialog = useNavigationBlocker({
    shouldBlock: isDirty && !loading && !isGenerating('gas'),
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
      if (isDirty && !loading && !isGenerating('gas')) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, loading, isGenerating]);


  const natureSupportsPresenceAutre = watch("nature_supports.presence_autre");
  const montagePresenceAutre = watch("montage.presence_autre");
  const transporteur = watch("conditionnement_transport.transporteur");
  const substancesPresenceAutre = watch("substances_recherchees.presence_autre");
  const echantillonnageDetails = watch("echantillonnage_details");
  const etancheificationRealise = watch("etancheification_sol.realise");
  const etancheificationType = watch("etancheification_sol.type");
  const etancheiteTestRealise = watch("etancheite_test.realise");
  const methodePlusieursSupports = watch("methode_plusieurs_supports");
  const montagePresenceFlexibles = watch("montage.presence_flexibles");
  const visualisationPointValue = watch('visualisation_point_prelevement');
  const preleveurValue = watch('preleveur');
  const preleveurOptions = withPreservedUserSelection(preleveurs, preleveurValue);

  // L'URL persistée (mode édition, brouillon) alimente l'aperçu tant qu'aucune
  // nouvelle photo n'est sélectionnée dans la session.
  useEffect(() => {
    if (visualisationFile) return;
    setVisualisationPersistedUrl(visualisationPointValue);
  }, [visualisationPointValue, visualisationFile, setVisualisationPersistedUrl]);

  const sections = [
    { id: 'section-en-tete', number: 1, title: 'En-tête', icon: Building2 },
    { id: 'section-conditions', number: 2, title: 'Description des conditions environnementales', icon: Cloud },
    { id: 'section-ouvrage', number: 3, title: 'Description de l\'ouvrage', icon: Wrench },
    { id: 'section-mise-en-place', number: 4, title: 'Mise en place du prélèvement', icon: Droplet },
    { id: 'section-purge', number: 5, title: 'Purge de l\'ouvrage', icon: Gauge },
    { id: 'section-prelevement', number: 6, title: 'Prélèvement', icon: Droplet },
    { id: 'section-conditionnement', number: 7, title: 'Conditionnement et transport', icon: Package },
  ];

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
    <>
      {navigationBlockerDialog}
      <FormPageLayout 
        siteId={siteId!} 
        title={`${isEditMode ? 'Modifier la' : 'Nouvelle'} Fiche de Prélèvement des Gaz du Sol`}
      subtitle="Enregistrement des données de prélèvement des gaz du sol"
      sidebar={
        <FormSidebar
          sections={sections}
          loading={loading}
          formId="gas-survey-form"
          onGeneratePdf={saveAndGeneratePdf}
          isGeneratingPdf={isGenerating('gas')}
        />
      }
    >
        {loading && isEditMode ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34519e]"></div>
          <span className="ml-2 text-muted-foreground">Chargement des données...</span>
          </div>
        ) : (
          <form id="gas-survey-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <AutoCalculatedPrelevementMetrics control={control} setValue={setValue} />
            {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-red-400" /></div>
                <div className="ml-3"><p className="text-sm text-red-700">{error}</p></div>
                </div>
              </div>
            )}

          {/* --- SECTION 1 : EN-TÊTE --- */}
          <FormSection id="section-en-tete" number={1} title="En-tête" icon={Building2}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InputField
                name="nom_prelevement"
                label="Nom du prélèvement"
                register={register}
                errors={errors}
              />
              <InputField
                name="date"
                label="Date du prélèvement"
                register={register}
                errors={errors}
                type="date"
              />
              <div>
                <label className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Préleveur</label>
                <select
                  {...register("preleveur")}
                  className="w-full px-3 py-2 text-sm lg:text-base border border-white/10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white/90 dark:bg-surface-200 text-foreground transition-colors"
                >
                  <option value="">Sélectionner un préleveur...</option>
                  {preleveurOptions.map((preleveur) => (
                    <option key={preleveur} value={preleveur}>
                      {preleveur}
                    </option>
                  ))}
                </select>
                {errors.preleveur && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.preleveur.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Coordonnées</h3>
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
                  <InputField
                    name="longitude"
                    label="Longitude"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="latitude"
                    label="Latitude"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="altitude"
                    label="Altitude"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <PhotoPickerField
                label="Visualisation du point de prélèvement"
                onPhotoSelected={(file, source) => {
                  // L'aperçu blob reste local : seule l'URL publique obtenue à
                  // la soumission est écrite dans le formulaire.
                  void visualisationPoint.selectPhoto(file, source);
                  setValue('visualisation_point_prelevement', '', {
                    shouldDirty: true,
                    shouldValidate: false,
                  });
                }}
              >
                {visualisationPoint.previewUrl && (
                  <div className="mt-3">
                    <SafeSurveyImage
                      src={visualisationPoint.previewUrl}
                      alt="Visualisation du point de prélèvement"
                      className="max-w-xs max-h-48 rounded-lg border object-contain"
                      isLocallyCreated={visualisationPoint.isLocalPreview}
                    />
                  </div>
                )}
              </PhotoPickerField>
            </div>
          </FormSection>

          {/* --- SECTION 2 : CONDITIONS ENVIRONNEMENTALES --- */}
          <FormSection id="section-conditions" number={2} title="Description des conditions environnementales" icon={Cloud}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
              <InputField
                name="pid_ambiant_ppm"
                label="PID ambiant (ppm)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <div className="sm:col-span-2">
                <RadioCardField
                  name="nature_revetement"
                  label="Nature du revêtement"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'Béton', label: 'Béton', icon: Building2 },
                    { value: 'Enrobé', label: 'Enrobé', icon: MapPin },
                    { value: 'Autre', label: 'Autre', icon: FileText },
                  ]}
                  columns={3}
                />
                {watch('nature_revetement') === 'Autre' && (
                  <div className="mt-4">
                    <InputField 
                      name="nature_revetement_autre" 
                      label="Préciser la nature du revêtement" 
                      register={register} 
                      errors={errors}
                      placeholder="Saisir la nature du revêtement"
                    />
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <RadioCardField
                  name="etat_revetement"
                  label="État du revêtement"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'Bon', label: 'Bon', icon: CheckCircle },
                    { value: 'Mauvais', label: 'Mauvais', icon: XCircle },
                    { value: 'Absent', label: 'Absent', icon: Minus },
                  ]}
                  columns={3}
                />
              </div>
              <InputField
                name="humidite_sol_surface"
                label="Humidité sol surface"
                register={register}
                errors={errors}
              />
              <InputField
                name="profondeur_nappe_msol"
                label="Profondeur nappe (m sol)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="date_dernieres_pluies"
                label="Date des dernières pluies"
                type="date"
                register={register}
                errors={errors}
              />
              <InputField
                name="nom_piezometre"
                label="Nom du piézomètre le plus proche"
                register={register}
                errors={errors}
              />
              </div>
            
            <div className="mb-6">
              <RadioCardField
                name="meteo"
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
            
            <div className="mb-6">
              <h3 className="text-base font-medium text-foreground mb-3">Pluie durant mesure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RadioCardField
                  name="pluie_durant_mesure.t0"
                  label="T0"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'true', label: 'Oui', icon: CheckCircle },
                    { value: 'false', label: 'Non', icon: XCircle },
                  ]}
                  columns={2}
                />
                <RadioCardField
                  name="pluie_durant_mesure.tfin"
                  label="Tfin"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'true', label: 'Oui', icon: CheckCircle },
                    { value: 'false', label: 'Non', icon: XCircle },
                  ]}
                  columns={2}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">Vent (km/h)</label>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="vent_kmh.t0"
                    label="T0"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="vent_kmh.tfin"
                    label="Tfin"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">Température de l'air (°C)</label>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="temperature_air_c.t0"
                    label="T0"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="temperature_air_c.tfin"
                    label="Tfin"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">Pression atmosphérique (hPa)</label>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="pression_atmospherique_hpa.t0"
                    label="T0"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="pression_atmospherique_hpa.tfin"
                    label="Tfin"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">Humidité air (%)</label>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    name="humidite_air_pct.t0"
                    label="T0"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="humidite_air_pct.tfin"
                    label="Tfin"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 3 : DESCRIPTION DE L'OUVRAGE --- */}
          <FormSection id="section-ouvrage" number={3} title="Description de l'ouvrage" icon={Wrench}>
            {/* Sélection du type d'ouvrage - 3 grandes cartes */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-6 dark:text-white/70">
                Sélectionnez le type d'ouvrage utilisé pour ce prélèvement
              </p>
              <RadioCardField
                name="type_ouvrage"
                label="Type d'ouvrage"
                register={register}
                watch={watch}
                errors={errors}
                options={[
                  { value: 'piezair', label: 'Piézair', icon: Droplet, description: 'Ouvrage piézair' },
                  { value: 'sous_dalle', label: 'Sous-dalle', icon: Layers, description: 'Ouvrage sous dalle' },
                  { value: 'canne_gaz', label: 'Canne-gaz', icon: Beaker, description: 'Canne à gaz' },
                ]}
                columns={3}
              />
            </div>

            {/* Champs conditionnels selon le type sélectionné */}
            {watch('type_ouvrage') === 'piezair' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-panel-lg p-6 rounded-2xl border border-primary/20"
              >
                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-6 flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-primary" />
                  Paramètres Piézair
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CheckboxField
                    name="ouvrage_piezair.bouchon_etanche"
                    label="Bouchon étanche"
                    register={register}
                  />
                  <InputField
                    name="ouvrage_piezair.profondeur_m"
                    label="Profondeur (m)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_piezair.diametre_tubage_interne_mm"
                    label="Diamètre tubage interne (mm)"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_piezair.volume_l"
                    label="Volume (l)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_piezair.presence_eau_hauteur_cm"
                    label="Présence eau hauteur (cm)"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_piezair.hauteur_cm"
                    label="Hauteur (cm)"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
              </motion.div>
            )}

            {watch('type_ouvrage') === 'sous_dalle' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-panel-lg p-6 rounded-2xl border border-primary/20"
              >
                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-6 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Paramètres Sous-dalle
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    name="ouvrage_sous_dalle.type"
                    label="Type"
                    register={register}
                    errors={errors}
                    options={[
                      { value: 'temporaire', label: 'Temporaire' },
                      { value: 'permanent', label: 'Permanent' }
                    ]}
                  />
                  <InputField
                    name="ouvrage_sous_dalle.epaisseur_dalle_m"
                    label="Épaisseur dalle (m)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_sous_dalle.profondeur_foration_m"
                    label="Profondeur foration (m)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_sous_dalle.diametre_foration_mm"
                    label="Diamètre foration (mm)"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_sous_dalle.volume_vide_cree_l"
                    label="Volume vide créé (l)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <CheckboxField
                    name="ouvrage_sous_dalle.presence_vide_sous_dalle"
                    label="Présence de vide sous dalle"
                    register={register}
                  />
                  <InputField
                    name="ouvrage_sous_dalle.etancheite"
                    label="Étanchéité"
                    register={register}
                    errors={errors}
                  />
                </div>
              </motion.div>
            )}

            {watch('type_ouvrage') === 'canne_gaz' && (
              <>
                <AutoCalculatedVolumeCanneGaz control={control} setValue={setValue} />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="glass-panel-lg p-6 rounded-2xl border border-primary/20"
                >
                  <h3 className="text-lg font-semibold text-foreground dark:text-white mb-6 flex items-center gap-2">
                    <Beaker className="h-5 w-5 text-primary" />
                    Paramètres Canne-gaz
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    name="ouvrage_canne_gaz.type"
                    label="Type"
                    register={register}
                    errors={errors}
                    options={[
                      { value: 'crepinee', label: 'Crépinée' },
                      { value: 'perdue', label: 'Perdue' },
                      { value: 'retractable', label: 'Rétractable' }
                    ]}
                  />
                  <InputField
                    name="ouvrage_canne_gaz.profondeur_m"
                    label="Profondeur (m)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_canne_gaz.profondeur_crepine_m"
                    label="Profondeur crépine (m)"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name="ouvrage_canne_gaz.diametre_mm"
                    label="Diamètre (mm)"
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    register={register}
                    errors={errors}
                  />
                </div>
                
                {/* Section des calculs automatiques */}
                <div className="sm:col-span-2 mt-6 border-2 border-primary/30 dark:border-primary/40 rounded-lg p-4 bg-primary/5 dark:bg-primary/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Calculs automatiques
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
                    <InputField
                      name="ouvrage_canne_gaz.volume_l"
                      label="Volume (l)"
                      type="number"
                      step="0.001"
                      inputMode="decimal"
                      register={register}
                      errors={errors}
                    />
                  </div>
                </div>
              </motion.div>
              </>
            )}
          </FormSection>

          {/* --- SECTION 4 : MISE EN PLACE DU PRÉLÈVEMENT --- */}
          <FormSection id="section-mise-en-place" number={4} title="Mise en place du prélèvement" icon={Droplet}>
            {/* Étanchéité test et Étanchéification sol côte à côte sur desktop */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
              {/* Étanchéité test */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">Étanchéité test</h3>
                </div>
                <div className="space-y-4">
                  <YesNoRadioField
                    name="etancheite_test.realise"
                    label="Réalisé"
                    control={control}
                    errors={errors}
                  />
                  {etancheiteTestRealise === true && (
                    <InputField
                      name="etancheite_test.resultat_o2"
                      label="Résultat O2"
                      register={register}
                      errors={errors}
                    />
                  )}
                </div>
              </div>

              {/* Étanchéification sol */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground dark:text-white">Étanchéification sol</h3>
                </div>
                <div className="space-y-4">
                  <YesNoRadioField
                    name="etancheification_sol.realise"
                    label="Étanchéification (GDS) réalisée ?"
                    control={control}
                    errors={errors}
                    yesLabel="Oui"
                    noLabel="Non"
                  />
                  {etancheificationRealise === true && (
                    <div className="space-y-4">
                      <RadioCardField
                        name="etancheification_sol.type"
                        label="Type"
                        register={register}
                        watch={watch}
                        errors={errors}
                        options={[
                          { value: 'Bâche', label: 'Bâche', icon: Package },
                          { value: 'Autre', label: 'Autre', icon: FileText },
                        ]}
                        columns={2}
                      />
                      {etancheificationType === 'Bâche' && (
                        <InputField
                          name="etancheification_sol.bache_couverture_superficie_m2"
                          label="Superficie de la bâche (m²)"
                          register={register}
                          errors={errors}
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="0.00"
                        />
                      )}
                      {etancheificationType === 'Autre' && (
                        <InputField
                          name="etancheification_sol.autre_details"
                          label="Autre (détails)"
                          register={register}
                          errors={errors}
                          placeholder="Préciser..."
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Échantillonnage */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TestTube className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">Échantillonnage</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <RadioCardField
                    name="echantillonnage_type"
                    label="Type"
                    register={register}
                    watch={watch}
                    errors={errors}
                    options={[
                      { value: 'Actif', label: 'Actif', icon: Zap },
                      { value: 'Passif', label: 'Passif', icon: Activity },
                    ]}
                    columns={2}
                  />
                </div>
                <div>
                  <RadioCardField
                    name="echantillonnage_details"
                    label="Détails"
                    register={register}
                    watch={watch}
                    errors={errors}
                    options={[
                      { value: 'Tube adsorption avec pompage', label: 'Tube adsorption avec pompage', icon: TestTube },
                      { value: 'Autre', label: 'Autre', icon: FileText },
                    ]}
                    columns={2}
                  />
                  {echantillonnageDetails === 'Autre' && (
                    <div className="mt-4">
                      <InputField
                        name="echantillonnage_details_autre"
                        label="Autre (détails)"
                        register={register}
                        errors={errors}
                        placeholder="Préciser..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nature support(s) */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TestTube className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">Nature support(s)</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <CheckboxField
                    name="nature_supports.charbon_actif"
                    label="Charbon actif"
                    register={register}
                  />
                  <CheckboxField
                    name="nature_supports.xad2"
                    label="XAD2"
                    register={register}
                  />
                  <CheckboxField
                    name="nature_supports.fluorisil"
                    label="Fluorisil"
                    register={register}
                  />
                </div>
                <div className="space-y-2">
                  <CheckboxField
                    name="nature_supports.carulite"
                    label="Carulite"
                    register={register}
                  />
                  <CheckboxField
                    name="nature_supports.presence_autre"
                    label="Autre"
                    register={register}
                  />
                  {natureSupportsPresenceAutre && (
                    <InputField
                      name="nature_supports.autre"
                      label="Autre (détails)"
                      register={register}
                      errors={errors}
                      placeholder="Préciser..."
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Méthode plusieurs supports */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">Méthode plusieurs supports</h3>
              </div>
              <div className="sm:col-span-2">
                <RadioCardField
                  name="methode_plusieurs_supports"
                  label="Méthode"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'une pompe par support', label: 'Une pompe par support', icon: Gauge },
                    { value: 'dispositif de répartition des flux', label: 'Dispositif de répartition des flux', icon: Settings },
                  ]}
                  columns={2}
                />
              </div>
              {methodePlusieursSupports === 'dispositif de répartition des flux' && (
                <div className="mt-4">
                  <InputField
                    name="details_repartition_flux"
                    label="Détails répartition flux"
                    register={register}
                    errors={errors}
                  />
                </div>
              )}
            </div>

            {/* Montage */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">Montage</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <CheckboxField
                    name="montage.pompe_gilair"
                    label="Pompe Gilair"
                    register={register}
                  />
                  <CheckboxField
                    name="montage.debitmetre_gocal"
                    label="Débitmètre Gocal"
                    register={register}
                  />
                  <CheckboxField
                    name="montage.filtre_humidite"
                    label="Filtre humidité"
                    register={register}
                  />
                </div>
                <div className="space-y-2">
                  <CheckboxField
                    name="montage.filtre_poussieres"
                    label="Filtre poussières"
                    register={register}
                  />
                  <CheckboxField
                    name="montage.presence_autre"
                    label="Autre"
                    register={register}
                  />
                  {montagePresenceAutre && (
                    <InputField
                      name="montage.autre"
                      label="Autre (détails)"
                      register={register}
                      errors={errors}
                      placeholder="Préciser..."
                    />
                  )}
                </div>
              </div>
              <div className="mt-4">
                <CheckboxField
                  name="montage.presence_flexibles"
                  label="Flexibles"
                  register={register}
                />
                {montagePresenceFlexibles && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <CheckboxField
                      name="montage.flexible_pehd"
                      label="PEHD"
                      register={register}
                    />
                    <CheckboxField
                      name="montage.flexible_ptfe"
                      label="PTFE"
                      register={register}
                    />
                    <CheckboxField
                      name="montage.flexible_pp"
                      label="PP"
                      register={register}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Identification blanc */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground dark:text-white">Identification blanc</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <RadioCardField
                    name="identification_blanc.type"
                    label="Type"
                    register={register}
                    watch={watch}
                    errors={errors}
                    options={[
                      { value: 'Terrain', label: 'Terrain', icon: MapPin },
                      { value: 'Transport', label: 'Transport', icon: Package },
                    ]}
                    columns={2}
                  />
                </div>
                <InputField
                  name="identification_blanc.nom"
                  label="Nom"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 5 : PURGE DE L'OUVRAGE --- */}
          <FormSection id="section-purge" number={5} title="Purge de l'ouvrage" icon={Gauge}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InputField
                name="purge_ouvrage.heure_debut"
                label="Heure début"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.debit_purge_lmin"
                label="Débit purge (l/min)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.duree_purge_min"
                label="Durée purge (min)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.volume_purge_l"
                label="Volume purge (l)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.pid_ppmv"
                label="PID (ppmv)"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.t0"
                label="T0"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.t1"
                label="T1"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.t2"
                label="T2"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
              <InputField
                name="purge_ouvrage.tfin_stabilise"
                label="Tfin stabilisé"
                type="number"
                step="0.01"
                inputMode="decimal"
                register={register}
                errors={errors}
              />
            </div>
          </FormSection>

          {/* --- SECTION 6 : PRÉLÈVEMENT --- */}
          <FormSection 
            id="section-prelevement"
            number={6}
            icon={Droplet} 
            title="Prélèvement"
            actionButton={
              <button 
                type="button" 
                onClick={() => {
                  const currentTime = new Date().toTimeString().slice(0, 5); // Format HH:MM
                  appendPrelevement({
                    heure_debut: currentTime,
                    heure_fin: currentTime,
                  });
                }} 
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un prélèvement
              </button>
            }
          >
            {prelevementFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun prélèvement ajouté. Cliquez sur "Ajouter un prélèvement" pour commencer.</p>
              </div>
            ) : (
              prelevementFields.map((field, index) => (
              <div key={field.id} className="mb-6 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-medium text-foreground">Prélèvement {index + 1}</h3>
                  <button 
                    type="button" 
                    onClick={() => removePrelevement(index)} 
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InputField
                    name={`prelevements.${index}.support`}
                    label="Support"
                    register={register}
                    errors={errors}
                  />
                  <InputField
                    name={`prelevements.${index}.heure_debut`}
                    label="Heure début"
                    register={register}
                    errors={errors}
                    type="time"
                  />
                  <InputField
                    name={`prelevements.${index}.heure_fin`}
                    label="Heure fin"
                    register={register}
                    errors={errors}
                    type="time"
                  />
                  <InputField
                    name={`prelevements.${index}.debit_t0`}
                    label="Débit t0 (début)"
                    register={register}
                    errors={errors}
                    type="number"
                    step="0.01"
                  />
                  <InputField
                    name={`prelevements.${index}.debit_t1`}
                    label="Débit t1 (intermédiaire)"
                    register={register}
                    errors={errors}
                    type="number"
                    step="0.01"
                  />
                  <InputField
                    name={`prelevements.${index}.debit_t2`}
                    label="Débit t2 (fin)"
                    register={register}
                    errors={errors}
                    type="number"
                    step="0.01"
                  />
                  <InputField
                    name={`prelevements.${index}.debit_retenu`}
                    label="Débit retenu"
                    register={register}
                    errors={errors}
                    type="number"
                    step="0.01"
                  />
                  <div className="space-y-2">
                    <CheckboxField
                      name={`prelevements.${index}.condensation_observee`}
                      label="Condensation observée"
                      register={register}
                    />
                    {watch(`prelevements.${index}.condensation_observee`) && (
                      <InputField
                        name={`prelevements.${index}.condensation_observee_details`}
                        label="Détails condensation"
                        register={register}
                        errors={errors}
                        placeholder="Décrire la condensation observée..."
                      />
                    )}
                  </div>
                  <InputField
                    name={`prelevements.${index}.duree_prelevement_min`}
                    label="Durée prélèvement (min)"
                    register={register}
                    errors={errors}
                    type="number"
                    readOnly
                  />
                  <InputField
                    name={`prelevements.${index}.volume_preleve_l`}
                    label="Volume prélevé (l)"
                    register={register}
                    errors={errors}
                    type="number"
                    step="0.01"
                    readOnly
                  />
                </div>
              </div>
              ))
            )}
          </FormSection>

          {/* --- SECTION 7 : CONDITIONNEMENT ET TRANSPORT --- */}
          <FormSection id="section-conditionnement" number={7} title="Conditionnement et transport" icon={Package}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <RadioCardField
                  name="conditionnement_transport.laboratoire"
                  label="Laboratoire"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[...LABORATOIRE_OPTIONS]}
                  columns={3}
                />
              </div>
              <div className="sm:col-span-2">
                <RadioCardField
                  name="conditionnement_transport.transporteur"
                  label="Transporteur"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[
                    { value: 'UPS', label: 'UPS', icon: Truck },
                    { value: 'Navette', label: 'Navette', icon: Package },
                    { value: 'Autre', label: 'Autre', icon: FileText },
                  ]}
                  columns={3}
                />
                {transporteur === 'Autre' && (
                  <div className="mt-4">
                    <InputField
                      name="conditionnement_transport.transporteur_autre"
                      label="Préciser le transporteur"
                      register={register}
                      errors={errors}
                      placeholder="Saisir le transporteur"
                    />
                  </div>
                )}
              </div>
              <InputField
                name="conditionnement_transport.date_depot"
                label="Date dépôt"
                type="date"
                register={register}
                errors={errors}
              />
              <InputField
                name="conditionnement_transport.date_envoi"
                label="Date envoi"
                type="date"
                register={register}
                errors={errors}
              />
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground dark:text-white mb-3">Substances recherchées</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <CheckboxField
                      name="substances_recherchees.tph_c5_c16_btex_cohv_naphtalene"
                      label="TPH C5-C16, BTEX, COHV, Naphtalène"
                      register={register}
                    />
                    <CheckboxField
                      name="substances_recherchees.mercure_volatil"
                      label="Mercure volatil"
                      register={register}
                    />
                    <CheckboxField
                      name="substances_recherchees.pcb"
                      label="PCB"
                      register={register}
                    />
                  </div>
                  <div className="space-y-2">
                    <CheckboxField
                      name="substances_recherchees.hap"
                      label="HAP"
                      register={register}
                    />
                    <CheckboxField
                      name="substances_recherchees.presence_autre"
                      label="Autre"
                      register={register}
                    />
                    {substancesPresenceAutre && (
                      <InputField
                        name="substances_recherchees.autre"
                        label="Autre (détails)"
                        register={register}
                        errors={errors}
                        placeholder="Préciser..."
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section d'actions en bas du formulaire */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="glass-panel-lg p-6 rounded-xl">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={saveAndGeneratePdf}
                  disabled={isGenerating('gas') || loading}
                  className="hidden lg:inline-flex w-full sm:w-auto min-w-[200px]"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating('gas') ? 'Génération...' : 'Télécharger le PDF'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading || isGenerating('gas')}
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
        )}
    </FormPageLayout>
    </>
  );
}