import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { submitSurveyUpsert, isLikelyNetworkError, type OfflinePhotoInput } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, AlertCircle, FileText, MapPin, Loader2, Info, Wrench, Eye, Package, Cloud, Camera, Sun, CloudRain, Wind, Download, RotateCw, MoreHorizontal, Layers, Settings, Hammer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useWeather } from '../../hooks/useWeather';
import { useUsers } from '../../hooks/useUsers';
import { withPreservedUserSelection } from '../../lib/constants/allowedFieldUsers';
import { useToast } from '../../contexts/ToastContext';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { SoilSurveySchema, type SoilSurveyFormData } from '../../schema/soilSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSection } from '../../components/forms/FormSection';
import { FormSidebar } from '../../components/forms/FormSidebar';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { RadioCardField } from '../../components/forms/fields/RadioCardField';
import { BarcodeScannerField } from '../../components/forms/fields/BarcodeScannerField';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getLocalDateString } from '../../lib/utils';
import { PhotoPickerField } from '../../components/forms/PhotoPickerField';
import { SafeSurveyImage } from '../../components/forms/SafeSurveyImage';
import { useSurveyPhotoField, useSurveyPhotoSlots } from '../../hooks/useSurveyPhotoField';
import { uploadSurveyPhoto } from '../../lib/photos/surveyPhotoPipeline';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../../components/forms/DraftRestoreBanner';

function canRestoreSoilDraft(data: unknown): boolean {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const o = data as Record<string, unknown>;
  if (Object.keys(o).length === 0) return false;
  const markers = [
    'designation_point',
    'date',
    'heure',
    'observations',
    'sondage_info',
    'coordonnees',
    'gestion_echantillons',
    'photos',
  ];
  return markers.some((k) => k in o);
}

const METEO_OPTIONS = [
  { value: 'Ensoleillé', label: 'Ensoleillé', icon: Sun },
  { value: 'Nuageux', label: 'Nuageux', icon: Cloud },
  { value: 'Venteux', label: 'Venteux', icon: Wind },
  { value: 'Pluvieux', label: 'Pluvieux', icon: CloudRain },
] as const;

const OUTIL_SONDAGE_OPTIONS = [
  { value: 'Tarière', label: 'Tarière', icon: Hammer },
  { value: 'Carottage', label: 'Carottage', icon: Layers },
  { value: 'Sous-gaine', label: 'Sous-gaine', icon: Settings },
  { value: 'Carotteuse portative', label: 'Carotteuse portative', icon: Package },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const GESTION_CUTTINGS_OPTIONS = [
  { value: 'Bigbag', label: 'Bigbag', icon: Package },
  { value: 'Remis en place', label: 'Remis en place', icon: RotateCw },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const REBOUCHAGE_REFECTION_OPTIONS = [
  { value: 'Cutting', label: 'Cutting', icon: Layers },
  { value: 'Béton', label: 'Béton', icon: Wrench },
  { value: 'Enrobé', label: 'Enrobé', icon: Settings },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const REVETEMENT_OPTIONS = [
  { value: 'Enrobé', label: 'Enrobé', icon: Settings },
  { value: 'Dalle', label: 'Dalle', icon: Layers },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const TYPE_FLACONNAGE_OPTIONS = [
  { value: 'Transparent (450mL)', label: 'Transparent (450mL)', icon: Package },
  { value: 'Brun (350mL)', label: 'Brun (350mL)', icon: Package },
] as const;

const LABORATOIRE_OPTIONS = [
  { value: 'ALS France', label: 'ALS France', icon: FileText },
  { value: 'Eurofins', label: 'Eurofins', icon: FileText },
  { value: 'Agrolab', label: 'Agrolab', icon: FileText },
] as const;

export function SoilSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // ID client stable pour upsert idempotent (anti-doublon)
  const draftId = useMemo(
    () =>
      surveyId ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
    [surveyId]
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { weather } = useWeather(userLocation?.lat, userLocation?.lng);
  const { showToast } = useToast();
  const { siteData } = useSiteDataForSurvey(siteId);
  const { data: preleveurs = [] } = useUsers({
    includeHistoricalPreleveurs: true,
    restrictToAllowedFieldUsers: true,
  });
  const { isDesktop } = useDeviceContext();
  const { generatePdf, isGenerating } = usePdfGenerator();

  const {
    scheduleSave: scheduleDraftSave,
    clearDraft: clearFormDraft,
    readDraft: readFormDraft,
    hasDraft: hasStoredFormDraft,
    storageKey: draftStorageKey,
  } = useFormDraft<SoilSurveyFormData>({
    formType: 'soil',
    siteId,
    enabled: Boolean(siteId) && !isEditMode,
  });

  const [draftPersistenceUnlocked, setDraftPersistenceUnlocked] = useState(isEditMode);
  const [showDraftRestoreBanner, setShowDraftRestoreBanner] = useState(false);

  // Photos : compression, pellicule et prévisualisation gérées par les hooks
  // dédiés. Les URLs blob restent confinées à l'affichage.
  const photoSondage = useSurveyPhotoField();
  // Photos de lithologie par observation (indexé par l'index de l'observation)
  const photoLithologie = useSurveyPhotoSlots();
  const { setPersistedUrl: setPhotoSondageUrl } = photoSondage;
  const { setPersistedUrls: setPhotoLithologieUrls } = photoLithologie;

  const { register, handleSubmit, control, formState: { errors, isDirty }, reset, watch, getValues, setValue } = useForm<SoilSurveyFormData>({
    resolver: zodResolver(SoilSurveySchema),
    defaultValues: {
      designation_point: '',
      numero_projet: '',
      client: '',
      commune: '',
      responsable_projet: '',
      preleveur: '',
      operateur: '',
      date: getLocalDateString(),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      meteo: undefined,
      temperature: undefined,
      coordonnees: {
        longitude: undefined,
        latitude: undefined,
        altitude: undefined,
      },
      sondage_info: {
        outil_sondage: undefined,
        outil_sondage_autre: '',
        prestataire: '',
        diametre_sondage_mm: undefined,
        profondeur_atteinte_m: undefined,
        rebouchage_refection: undefined,
        rebouchage_refection_autre: '',
        gestion_cuttings: undefined,
        gestion_cuttings_autre: '',
        revetement: undefined,
        revetement_autre: '',
        remarques: '',
      },
      observations: [{
        profondeur_m: '',
        description_lithologique: '',
        eau: '',
        organoleptiques: '',
        pid_ppm: undefined,
        echantillons: '',
        remarques: '',
        photo_lithologie_url: '',
      }],
      photos: {
        photo_sondage_url: '',
      },
      gestion_echantillons: {
        type_flaconnage: undefined,
        laboratoire: undefined,
        expedie_le: getLocalDateString(),
        conditionnement: 'Glacière',
        codes_barre: '',
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "observations"
  });

  useEffect(() => {
    if (isEditMode || !siteId) {
      setDraftPersistenceUnlocked(true);
      setShowDraftRestoreBanner(false);
      return;
    }
    if (!draftStorageKey) {
      setDraftPersistenceUnlocked(true);
      setShowDraftRestoreBanner(false);
      return;
    }
    const parsed = readFormDraft();
    if (!hasStoredFormDraft) {
      setDraftPersistenceUnlocked(true);
      setShowDraftRestoreBanner(false);
      return;
    }
    if (parsed && canRestoreSoilDraft(parsed)) {
      setShowDraftRestoreBanner(true);
      setDraftPersistenceUnlocked(false);
      return;
    }
    clearFormDraft();
    setDraftPersistenceUnlocked(true);
    setShowDraftRestoreBanner(false);
  }, [
    isEditMode,
    siteId,
    draftStorageKey,
    hasStoredFormDraft,
    readFormDraft,
    clearFormDraft,
  ]);

  useEffect(() => {
    if (isEditMode || !siteId || !draftPersistenceUnlocked) return;
    const subscription = watch((value) => {
      scheduleDraftSave(value as SoilSurveyFormData);
    });
    return () => subscription.unsubscribe();
  }, [isEditMode, siteId, draftPersistenceUnlocked, watch, scheduleDraftSave]);

  const handleRestoreFormDraft = () => {
    const parsed = readFormDraft();
    if (!parsed || !canRestoreSoilDraft(parsed)) {
      showToast('error', 'Brouillon illisible ou invalide.');
      clearFormDraft();
      setShowDraftRestoreBanner(false);
      setDraftPersistenceUnlocked(true);
      return;
    }
    const p = parsed as Partial<SoilSurveyFormData>;
    const current = getValues();
    reset({
      ...current,
      ...p,
      coordonnees: { ...current.coordonnees, ...p.coordonnees },
      sondage_info: { ...current.sondage_info, ...p.sondage_info },
      observations:
        p.observations && p.observations.length > 0 ? p.observations : current.observations,
      photos: { ...current.photos, ...p.photos },
      gestion_echantillons: { ...current.gestion_echantillons, ...p.gestion_echantillons },
    } as SoilSurveyFormData);

    if (p.photos?.photo_sondage_url) {
      setPhotoSondageUrl(p.photos.photo_sondage_url);
    }

    if (p.observations?.length) {
      setPhotoLithologieUrls(p.observations.map((obs) => obs.photo_lithologie_url));
    }

    setShowDraftRestoreBanner(false);
    setDraftPersistenceUnlocked(true);
  };

  const handleDismissFormDraft = () => {
    clearFormDraft();
    setShowDraftRestoreBanner(false);
    setDraftPersistenceUnlocked(true);
  };

  // Récupérer la localisation de l'utilisateur pour la température
  useEffect(() => {
    if (!isEditMode) {
      const fetchUserLocation = async () => {
        try {
          const position = await getPosition();
          setUserLocation({ lat: position.lat, lng: position.lng });
        } catch (error) {
          console.error('Erreur lors de la récupération de la position pour la température:', error);
        }
      };
      fetchUserLocation();
    }
  }, [isEditMode, getPosition]);

  // Pré-remplir la température si elle est disponible depuis la météo
  useEffect(() => {
    if (!isEditMode && weather?.temperature !== undefined) {
      const currentTemperature = watch('temperature');
      // Ne remplir que si le champ est vide (undefined ou null)
      if (currentTemperature === undefined || currentTemperature === null) {
        setValue('temperature', weather.temperature, { shouldValidate: false });
      }
    }
  }, [weather, isEditMode, setValue, watch]);

  // Pré-remplir les champs depuis les données du site (cohérence métier).
  useEffect(() => {
    if (!siteData) return;
    if (siteData.project_number) setValue('numero_projet', siteData.project_number);
    if (siteData.name) setValue('client', siteData.name);
    if (siteData.city) setValue('commune', siteData.city);
    if (siteData.project_manager) setValue('responsable_projet', siteData.project_manager);
    if (siteData.drilling_company) setValue('sondage_info.prestataire', siteData.drilling_company);
  }, [siteData, setValue]);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId && siteId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const loadedData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (loadedData) {
            const formData: any = { ...loadedData };

            if (siteData?.project_number) {
              formData.numero_projet = siteData.project_number;
            }
            if (siteData?.name) {
              formData.client = siteData.name;
            }
            if (siteData?.city) {
              formData.commune = siteData.city;
            }
            // Les données du site priment pour garantir la cohérence.
            if (siteData?.project_manager) {
              formData.responsable_projet = siteData.project_manager;
            }
            // Les données du site priment pour garantir la cohérence.
            if (siteData?.drilling_company) {
              if (!formData.sondage_info) {
                formData.sondage_info = {};
              }
              formData.sondage_info.prestataire = siteData.drilling_company;
            }

            // S'assurer que les observations ont au moins 1 élément
            if (!formData.observations || formData.observations.length === 0) {
              formData.observations = [{}];
            }

            // Compatibilité ascendante : l'ancien laboratoire "Wessling" est devenu "ALS France".
            if (formData.gestion_echantillons?.laboratoire === 'Wessling') {
              formData.gestion_echantillons.laboratoire = 'ALS France';
            }

            reset(formData as SoilSurveyFormData);
            
            // S'assurer que le préleveur est bien restauré
            if (formData.preleveur) {
              setValue('preleveur', formData.preleveur);
            }
            // S'assurer que le responsable_projet est bien restauré
            if (formData.responsable_projet) {
              setValue('responsable_projet', formData.responsable_projet);
            }
            
            // Charger les prévisualisations des photos si elles existent
            setPhotoSondageUrl(formData.photos?.photo_sondage_url);
            if (formData.observations) {
              setPhotoLithologieUrls(
                formData.observations.map((obs: any) => obs.photo_lithologie_url)
              );
            }
          }
        } catch (err: any) {
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      loadSurveyData();
    }
  }, [
    isEditMode,
    surveyId,
    siteId,
    reset,
    siteData,
    setValue,
    setPhotoSondageUrl,
    setPhotoLithologieUrls,
  ]);

  const onSubmitInternal = async (formData: SoilSurveyFormData, shouldNavigate = true) => {
    setLoading(true);
    setError('');

    // Collecte des photos avec leur fieldPath pour une éventuelle mise en queue.
    // Ces chemins doivent correspondre exactement au schéma Zod (`photos` et
    // `observations[].photo_lithologie_url`) pour que le rejeu réinjecte l'URL
    // publique au bon endroit.
    const pendingPhotoInputs: OfflinePhotoInput[] = [];
    if (photoSondage.file) {
      pendingPhotoInputs.push({ file: photoSondage.file, fieldPath: 'photos.photo_sondage_url' });
    }
    photoLithologie.entries().forEach(({ index, file }) => {
      pendingPhotoInputs.push({
        file,
        fieldPath: `observations.${index}.photo_lithologie_url`,
      });
    });

    try {
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      // --- Upload des photos (best effort en ligne) ---
      const photos: { photo_sondage_url?: string } = formData.photos?.photo_sondage_url
        ? { photo_sondage_url: formData.photos.photo_sondage_url }
        : {};

      let hadPhotoNetworkFailure = false;

      if (!isOffline && photoSondage.file) {
        try {
          const publicUrl = await uploadSurveyPhoto({
            file: photoSondage.file,
            siteId: siteId ?? null,
            surveyType: 'soil',
            fieldSuffix: 'sondage',
          });
          photos.photo_sondage_url = publicUrl;
          photoSondage.markUploaded(publicUrl);
        } catch (photoErr) {
          if (isLikelyNetworkError(photoErr)) {
            hadPhotoNetworkFailure = true;
          } else {
            throw photoErr;
          }
        }
      }

      // Préserver TOUS les champs de chaque observation, y compris echantillons
      const observationsWithPhotos = formData.observations.map((obs: any, index: number) => {
        const currentObsValue = getValues(`observations.${index}.echantillons`);
        return {
          profondeur_m: obs.profondeur_m || '',
          description_lithologique: obs.description_lithologique || '',
          eau: obs.eau || '',
          organoleptiques: obs.organoleptiques || '',
          pid_ppm: obs.pid_ppm,
          echantillons:
            currentObsValue !== undefined && currentObsValue !== null
              ? currentObsValue
              : obs.echantillons || '',
          remarques: obs.remarques || '',
          photo_lithologie_url: obs.photo_lithologie_url || '',
        };
      });

      if (!isOffline && !hadPhotoNetworkFailure) {
        for (const { index, file } of photoLithologie.entries()) {
          if (!observationsWithPhotos[index]) continue;
          try {
            const publicUrl = await uploadSurveyPhoto({
              file,
              siteId: siteId ?? null,
              surveyType: 'soil',
              fieldSuffix: `lithologie-${index}`,
            });
            observationsWithPhotos[index].photo_lithologie_url = publicUrl;
            photoLithologie.markUploaded(index, publicUrl);
          } catch (photoErr) {
            if (isLikelyNetworkError(photoErr)) {
              hadPhotoNetworkFailure = true;
              break;
            }
            throw photoErr;
          }
        }
      }

      formData.observations = observationsWithPhotos;

      // Récupérer les données du site pour s'assurer qu'elles sont à jour
      if (siteId && !isOffline) {
        try {
          const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('project_number, name, city, project_manager, drilling_company')
            .eq('id', siteId)
            .single();
          if (!siteError && siteData) {
            formData.numero_projet = siteData.project_number || formData.numero_projet;
            formData.client = siteData.name || formData.client;
            formData.commune = siteData.city || formData.commune;
            if (siteData.project_manager && !formData.responsable_projet) {
              formData.responsable_projet = siteData.project_manager;
            }
            if (siteData.drilling_company) {
              if (!formData.sondage_info) formData.sondage_info = {};
              if (!formData.sondage_info.prestataire) {
                formData.sondage_info.prestataire = siteData.drilling_company;
              }
            }
          }
        } catch (siteErr) {
          if (!isLikelyNetworkError(siteErr)) throw siteErr;
        }
      }

      if (!formData.gestion_echantillons) formData.gestion_echantillons = {};
      formData.gestion_echantillons.conditionnement = 'Glacière';

      const specificData = {
        ...formData,
        photos: Object.keys(photos).length > 0 ? photos : formData.photos,
      };

      // Si offline OU échec réseau sur les photos, on met les blobs en queue
      // pour rejouer l'upload + l'injection d'URL plus tard.
      const photosForQueue: OfflinePhotoInput[] =
        isOffline || hadPhotoNetworkFailure ? pendingPhotoInputs : [];

      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'soil',
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData,
        name: formData.designation_point.trim() || null,
        photos: photosForQueue,
      });

      if (!isEditMode) {
        clearFormDraft();
      }

      const dataForReset = JSON.parse(JSON.stringify(formData));
      dataForReset.observations = dataForReset.observations.map((obs: any) => ({
        ...obs,
        echantillons: obs.echantillons || '',
        profondeur_m: obs.profondeur_m || '',
        description_lithologique: obs.description_lithologique || '',
        eau: obs.eau || '',
        organoleptiques: obs.organoleptiques || '',
        pid_ppm: obs.pid_ppm,
        remarques: obs.remarques || '',
        photo_lithologie_url: obs.photo_lithologie_url || '',
      }));
      reset(dataForReset as SoilSurveyFormData, { keepValues: true });

      if (result.status === 'pending') {
        showToast(
          'warning',
          'Connexion perdue. Fiche sauvegardée localement. Synchronisation automatique au retour du réseau.',
          0,
          'offline-pending'
        );
      } else {
        showToast('success', isEditMode ? 'Fiche mise à jour avec succès' : 'Fiche enregistrée avec succès');
      }

      if (shouldNavigate) {
        navigate(`/sites/${siteId}`);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<SoilSurveyFormData> = async (formData) => {
    return onSubmitInternal(formData, true);
  };

  // Fonction pour sauvegarder et générer le PDF
  const saveAndGeneratePdf = async () => {
    try {
      // Sauvegarder d'abord (sans navigation)
      // Utiliser getValues() au lieu de watch() pour s'assurer d'avoir les valeurs les plus récentes
      const formData = getValues();
      await onSubmitInternal(formData, false);
      
      // Attendre un peu pour s'assurer que la sauvegarde est terminée
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer le PDF avec les données sauvegardées
      await generatePdf('soil', formData as SoilSurveyFormData, siteData?.name || '', siteId || undefined);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde/génération PDF:', err);
      showToast('error', 'Erreur lors de la sauvegarde ou de la génération du PDF');
    }
  };

  // Protection contre la navigation sans sauvegarde
  // Ne pas bloquer pendant le chargement ou la génération du PDF
  const navigationBlockerDialog = useNavigationBlocker({
    shouldBlock: isDirty && !loading && !isGenerating('soil'),
    message: 'Vous avez des modifications non sauvegardées.',
    onSave: async () => {
      // Utiliser getValues() au lieu de watch() pour s'assurer d'avoir les valeurs les plus récentes
      // Cela garantit que les valeurs saisies dans les champs (comme echantillons) sont bien capturées
      const formData = getValues();
      await onSubmitInternal(formData, false);
    },
    isSaving: loading,
  });

  // Protection beforeunload pour quitter la page (fermeture d'onglet/navigateur)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !loading && !isGenerating('soil')) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, loading, isGenerating]);

  const sections = [
    { id: 'section-designation', number: 1, title: 'Désignation du point', icon: Info },
    { id: 'section-general', number: 2, title: 'Informations générales', icon: Info },
    { id: 'section-survey-info', number: 3, title: 'Informations sur le sondage', icon: Wrench },
    { id: 'section-observations', number: 4, title: 'Observations et mesures', icon: Eye },
    { id: 'section-photos', number: 5, title: 'Photographies', icon: Camera },
    { id: 'section-samples', number: 6, title: 'Gestion des échantillons', icon: Package },
  ];

  const preleveurValue = watch('preleveur');
  const preleveurOptions = withPreservedUserSelection(preleveurs, preleveurValue);

  return (
    <>
      {navigationBlockerDialog}
      <FormPageLayout 
        siteId={siteId!} 
        title={`${isEditMode ? 'Modifier la' : 'Nouvelle'} Fiche de Sondage de Sols`}
        subtitle="Enregistrement des données de terrain pour les sondages de sol"
        sidebar={
        <FormSidebar
          sections={sections}
          loading={loading}
          formId="survey-form"
          onGeneratePdf={saveAndGeneratePdf}
          isGeneratingPdf={isGenerating('soil')}
        />
      }
    >
      {hasStoredFormDraft && !isEditMode && showDraftRestoreBanner && (
        <DraftRestoreBanner onRestore={handleRestoreFormDraft} onDismiss={handleDismissFormDraft} />
      )}
      <form id="survey-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Désignation du point */}
        <FormSection id="section-designation" number={1} title="Désignation du point" icon={Info}>
          <InputField name="designation_point" label="Désignation du point" register={register} errors={errors} isRequired />
        </FormSection>

        {/* Section 2: Informations générales */}
        <FormSection id="section-general" number={2} title="Informations générales" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SelectField
              name="preleveur"
              label="Préleveur"
              register={register}
              errors={errors}
              options={preleveurOptions.map(p => ({ value: p, label: p }))}
              placeholder="Sélectionner un préleveur"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">
                  Longitude
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { lat, lng, alt } = await getPosition();
                      setValue('coordonnees.longitude', lng);
                      setValue('coordonnees.latitude', lat);
                      if (alt !== null && alt !== undefined) {
                        setValue('coordonnees.altitude', alt);
                      }
                      showToast('success', 'Coordonnées GPS remplies avec succès !');
                    } catch (err: any) {
                      showToast('warning', err.message || 'Géolocalisation indisponible. Saisie manuelle possible.', 6000);
                    }
                  }}
                  disabled={!!isGeolocating}
                >
                  {isGeolocating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recherche...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Auto
                    </>
                  )}
                </Button>
              </div>
              <InputField 
                name="coordonnees.longitude" 
                label="" 
                type="number"
                step="0.000001"
                register={register} 
                errors={errors}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">
                  Latitude
                </label>
              </div>
              <InputField 
                name="coordonnees.latitude" 
                label="" 
                type="number"
                step="0.000001"
                register={register} 
                errors={errors}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground dark:text-white">
                  Altitude
                </label>
              </div>
              <InputField 
                name="coordonnees.altitude" 
                label="" 
                type="number"
                step="0.01"
                register={register} 
                errors={errors}
                inputMode="decimal"
              />
            </div>
            <InputField name="date" label="Date" type="date" register={register} errors={errors} isRequired />
            <InputField name="heure" label="Heure" type="time" register={register} errors={errors} isRequired />
            <div className="sm:col-span-2">
              <RadioCardField
                name="meteo"
                label="Météo"
                register={register}
                watch={watch}
                errors={errors}
                options={[...METEO_OPTIONS]}
                columns={4}
              />
            </div>
            <InputField 
              name="temperature" 
              label="Température (°C)" 
              type="number" 
              step="0.1"
              register={register} 
              errors={errors}
              inputMode="decimal"
            />
          </div>
        </FormSection>

        {/* Section 3: Informations sur le sondage */}
        <FormSection id="section-survey-info" number={3} title="Informations sur le sondage" icon={Wrench}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <RadioCardField
                name="sondage_info.outil_sondage"
                label="Outil de sondage"
                register={register}
                watch={watch}
                errors={errors}
                options={[...OUTIL_SONDAGE_OPTIONS]}
                columns={4}
              />
              {watch('sondage_info.outil_sondage') === 'Autre' && (
                <div className="mt-4">
                  <InputField 
                    name="sondage_info.outil_sondage_autre" 
                    label="Préciser l'outil de sondage" 
                    register={register} 
                    errors={errors}
                    placeholder="Saisir l'outil de sondage"
                  />
                </div>
              )}
            </div>
            <InputField 
              name="sondage_info.diametre_sondage_mm" 
              label="Diamètre sondage (mm)" 
              type="number"
              register={register} 
              errors={errors}
              inputMode="numeric"
            />
            <InputField 
              name="sondage_info.profondeur_atteinte_m" 
              label="Profondeur atteinte (m)" 
              type="number"
              step="0.01"
              register={register} 
              errors={errors}
              inputMode="decimal"
            />
            <div className="md:col-span-2">
              <RadioCardField
                name="sondage_info.rebouchage_refection"
                label="Rebouchage et réfection"
                register={register}
                watch={watch}
                errors={errors}
                options={[...REBOUCHAGE_REFECTION_OPTIONS]}
                columns={4}
              />
              {watch('sondage_info.rebouchage_refection') === 'Autre' && (
                <div className="mt-4">
                  <InputField 
                    name="sondage_info.rebouchage_refection_autre" 
                    label="Préciser le rebouchage et la réfection" 
                    register={register} 
                    errors={errors}
                    placeholder="Saisir le rebouchage et la réfection"
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <RadioCardField
                name="sondage_info.gestion_cuttings"
                label="Gestion des cuttings"
                register={register}
                watch={watch}
                errors={errors}
                options={[...GESTION_CUTTINGS_OPTIONS]}
                columns={3}
              />
              {watch('sondage_info.gestion_cuttings') === 'Autre' && (
                <div className="mt-4">
                  <InputField 
                    name="sondage_info.gestion_cuttings_autre" 
                    label="Préciser la gestion des cuttings" 
                    register={register} 
                    errors={errors}
                    placeholder="Saisir la gestion des cuttings"
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <RadioCardField
                name="sondage_info.revetement"
                label="Revêtement"
                register={register}
                watch={watch}
                errors={errors}
                options={[...REVETEMENT_OPTIONS]}
                columns={3}
              />
              {watch('sondage_info.revetement') === 'Autre' && (
                <div className="mt-4">
                  <InputField 
                    name="sondage_info.revetement_autre" 
                    label="Préciser le revêtement" 
                    register={register} 
                    errors={errors}
                    placeholder="Saisir le revêtement"
                  />
                </div>
              )}
            </div>
          </div>
          <TextareaField name="sondage_info.remarques" label="Remarques" register={register} errors={errors} className="mt-6" />
        </FormSection>

        {/* Section 4: Observations et mesures */}
        <FormSection 
          id="section-observations"
          number={4} 
          title="Observations et mesures"
          icon={Eye}
          onAddRow={fields.length < 6 ? () => append({}) : undefined}
        >
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="border-muted/50 shadow-sm animate-enter">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground">Observation {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField 
                      name={`observations.${index}.profondeur_m`} 
                      label="Profondeur (m)" 
                      register={register} 
                      errors={errors}
                    />
                    <InputField 
                      name={`observations.${index}.description_lithologique`} 
                      label="Description lithologique" 
                      register={register} 
                      errors={errors} 
                    />
                    <InputField 
                      name={`observations.${index}.eau`} 
                      label="Eau" 
                      register={register} 
                      errors={errors} 
                    />
                    <InputField 
                      name={`observations.${index}.organoleptiques`} 
                      label="Organoleptiques" 
                      register={register} 
                      errors={errors} 
                    />
                    <InputField 
                      name={`observations.${index}.pid_ppm`} 
                      label="PID (ppm)" 
                      type="number"
                      step="0.1"
                      register={register} 
                      errors={errors}
                      inputMode="decimal"
                    />
                    <BarcodeScannerField 
                      name={`observations.${index}.echantillons`} 
                      label="Échantillons" 
                      register={register} 
                      errors={errors}
                      setValue={(name, value) => setValue(name as any, value)}
                    />
                  </div>
                  <div className="mt-4">
                    <PhotoPickerField
                      label="Photographie de la lithologie"
                      onPhotoSelected={(file, source) => {
                        void photoLithologie.selectPhoto(index, file, source);
                      }}
                    >
                      {photoLithologie.getPreviewUrl(index) && (
                        <div className="mt-4">
                          <SafeSurveyImage
                            src={photoLithologie.getPreviewUrl(index)}
                            alt={`Aperçu photo lithologie observation ${index + 1}`}
                            className="h-48 w-full object-cover rounded-lg border"
                            isLocallyCreated={photoLithologie.isLocalPreview(index)}
                          />
                        </div>
                      )}
                    </PhotoPickerField>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </FormSection>

        {/* Section 5: Photographies */}
        <FormSection id="section-photos" number={5} title="Photographies" icon={Camera}>
          <PhotoPickerField
            label="Photographie du sondage (vue globale)"
            onPhotoSelected={(file, source) => {
              void photoSondage.selectPhoto(file, source);
            }}
          >
            {photoSondage.previewUrl && (
              <div className="mt-4">
                <SafeSurveyImage
                  src={photoSondage.previewUrl}
                  alt="Aperçu photo sondage"
                  className="h-48 w-full object-cover rounded-lg border"
                  isLocallyCreated={photoSondage.isLocalPreview}
                />
              </div>
            )}
          </PhotoPickerField>
        </FormSection>

        {/* Section 6: Gestion des échantillons */}
        <FormSection id="section-samples" number={6} title="Gestion des échantillons" icon={Package}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <RadioCardField
                name="gestion_echantillons.type_flaconnage"
                label="Type de flaconnage"
                register={register}
                watch={watch}
                errors={errors}
                options={[...TYPE_FLACONNAGE_OPTIONS]}
                columns={2}
              />
            </div>
            <div className="md:col-span-2">
              <RadioCardField
                name="gestion_echantillons.laboratoire"
                label="Laboratoire"
                register={register}
                watch={watch}
                errors={errors}
                options={[...LABORATOIRE_OPTIONS]}
                columns={3}
              />
            </div>
            <InputField name="gestion_echantillons.expedie_le" label="Expédié le" type="date" register={register} errors={errors} />
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
                disabled={isGenerating('soil') || loading}
                className="hidden lg:inline-flex w-full sm:w-auto min-w-[200px]"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating('soil') ? 'Génération...' : 'Télécharger le PDF'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || isGenerating('soil')}
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
