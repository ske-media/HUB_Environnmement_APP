import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';
import { useForm, SubmitHandler, useWatch, Control, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Building2, Wrench, Droplet, Gauge, FileText, TestTube, MapPin, Loader2, Calculator, Sun, Cloud, CloudRain, Wind, Download, Package, MoreHorizontal, Truck, Beaker, Zap, Layers, Pause, Play, FlaskConical, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import {
  submitSurveyUpsert,
  isLikelyNetworkError,
  type OfflinePhotoInput,
} from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useUsers } from '../../hooks/useUsers';
import { withPreservedUserSelection } from '../../lib/constants/allowedFieldUsers';
import { useToast } from '../../contexts/ToastContext';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';
import { Button } from '../../components/ui/Button';
import { GroundwaterSurveySchema, type GroundwaterSurveyFormData } from '../../schema/groundwaterSurveySchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSection } from '../../components/forms/FormSection';
import { FormSidebar } from '../../components/forms/FormSidebar';
import { InputField } from '../../components/forms/fields/InputField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { RadioCardField } from '../../components/forms/fields/RadioCardField';
import { CheckboxCardField } from '../../components/forms/fields/CheckboxCardField';
import { getLocalDateString } from '../../lib/utils';
import { PhotoPickerField } from '../../components/forms/PhotoPickerField';
import { SafeSurveyImage } from '../../components/forms/SafeSurveyImage';
import { useSurveyPhotoField } from '../../hooks/useSurveyPhotoField';
import { uploadSurveyPhoto } from '../../lib/photos/surveyPhotoPipeline';

// --- Constantes ---
const TYPE_FLACONNAGE_OPTIONS = [
  { value: 'Transparent (450mL)', label: 'Transparent (450mL)', icon: Package },
  { value: 'Brun (350mL)', label: 'Brun (350mL)', icon: Package },
] as const;

const LABORATOIRE_OPTIONS = [
  { value: 'ALS France', label: 'ALS France', icon: FileText },
  { value: 'Eurofins', label: 'Eurofins', icon: FileText },
  { value: 'Agrolab', label: 'Agrolab', icon: FileText },
] as const;

const METEO_OPTIONS = [
  { value: 'Ensoleillé', label: 'Ensoleillé', icon: Sun },
  { value: 'Nuageux', label: 'Nuageux', icon: Cloud },
  { value: 'Venteux', label: 'Venteux', icon: Wind },
  { value: 'Pluvieux', label: 'Pluvieux', icon: CloudRain },
] as const;

const PERIODE_OPTIONS = [
  { value: 'Hautes eaux', label: 'Hautes eaux' },
  { value: 'Basses eaux', label: 'Basses eaux' },
] as const;

const ETAT_OPTIONS = [
  { value: 'Bon', label: 'Bon' },
  { value: 'Dégradé', label: 'Dégradé' },
  { value: 'Hors d\'usage', label: 'Hors d\'usage' },
  { value: 'Non trouvé', label: 'Non trouvé' },
] as const;

const TYPE_CAPOT_OPTIONS = [
  { value: 'Hors-sol', label: 'Hors-sol' },
  { value: 'Ras-de-sol', label: 'Ras-de-sol' },
] as const;

const TYPE_TUBAGE_OPTIONS = [
  { value: 'PVC', label: 'PVC' },
  { value: 'PEHD', label: 'PEHD' },
  { value: 'Autre', label: 'Autre' },
] as const;

const MATERIEL_OPTIONS = [
  { value: 'Bailer', label: 'Bailer', icon: Beaker },
  { value: 'Pompe immergée', label: 'Pompe immergée', icon: Zap },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const MATERIAUX_TUYAUX_OPTIONS = [
  { value: 'PVC', label: 'PVC', icon: Layers },
  { value: 'PEHD', label: 'PEHD', icon: Layers },
] as const;

const TYPE_PURGE_OPTIONS = [
  { value: 'Statique', label: 'Statique', icon: Pause },
  { value: 'Dynamique', label: 'Dynamique', icon: Play },
] as const;

const NETTOYAGE_OPTIONS = [
  { value: 'Eau claire', label: 'Eau claire', icon: Droplet },
  { value: 'Alcool', label: 'Alcool', icon: FlaskConical },
  { value: 'Autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const TRAITEMENT_EAU_OPTIONS = [
  { value: 'charbon_actif', label: 'Charbon actif', icon: Filter },
  { value: 'autre', label: 'Autre', icon: MoreHorizontal },
] as const;

const DIAMETRE_OPTIONS = [
  { value: '52/60mm', label: '52/60mm' },
  { value: '26/32mm', label: '26/32mm' },
  { value: 'autre', label: 'Autre' },
] as const;

const SUBSTANCES_OPTIONS = [
  { value: 'hct', label: 'HCT' },
  { value: 'hap', label: 'HAP' },
  { value: 'btex', label: 'BTEX' },
  { value: 'cohv', label: 'COHV' },
  { value: 'pcb', label: 'PCB' },
  { value: 'metaux', label: 'Métaux' },
  { value: 'pesticides', label: 'Pesticides' },
  { value: 'pfas', label: 'PFAS' },
  { value: 'phenol', label: 'Phénol' },
  { value: 'autre', label: 'Autre' },
] as const;

// --- Composant pour les calculs automatiques des volumes ---
const AutoCalculatedVolumes = ({ control, setValue }: { control: Control<GroundwaterSurveyFormData>, setValue: Function }) => {
  const [profondeurTotale, niveauEau, diametre, diametreAutre] = useWatch({
    control,
    name: [
      "caracteristiques.profondeur_totale_m",
      "caracteristiques.niveau_eau_m",
      "caracteristiques.diametre",
      "caracteristiques.diametre_autre"
    ]
  });

  useEffect(() => {
    try {
      const pt = typeof profondeurTotale === 'number' ? profondeurTotale : parseFloat(String(profondeurTotale || '0'));
      const ne = typeof niveauEau === 'number' ? niveauEau : parseFloat(String(niveauEau || '0'));
      
      // Extraire le diamètre intérieur en cm
      let diCm = 0;
      if (diametre === '52/60mm') {
        diCm = 5.2; // 52mm = 5.2cm
      } else if (diametre === '26/32mm') {
        diCm = 2.6; // 26mm = 2.6cm
      } else if (diametre === 'autre' && diametreAutre) {
        // Utiliser directement la valeur numérique (en mm)
        const diMm = typeof diametreAutre === 'number' ? diametreAutre : parseFloat(String(diametreAutre || '0'));
        if (diMm > 0) {
          diCm = diMm / 10; // mm to cm
        }
      }

      if (pt > 0 && ne > 0 && pt > ne) {
        const hauteurColonneEau = Math.round((pt - ne) * 1000) / 1000; // Arrondi à 3 décimales
        setValue('caracteristiques.hauteur_colonne_eau_m', hauteurColonneEau, { shouldValidate: false });
        
        if (diCm > 0) {
          const radius = diCm / 200; // cm to m
          const volume = Math.PI * Math.pow(radius, 2) * hauteurColonneEau * 1000; // m³ to liters
          const volumeRounded = Math.round(volume * 1000) / 1000; // Arrondi à 3 décimales
          setValue('caracteristiques.volume_eau_l', volumeRounded, { shouldValidate: false });
          setValue('caracteristiques.volume_3_l', Math.round(volumeRounded * 3 * 1000) / 1000, { shouldValidate: false });
        }
      } else {
        setValue('caracteristiques.hauteur_colonne_eau_m', undefined, { shouldValidate: false });
        setValue('caracteristiques.volume_eau_l', undefined, { shouldValidate: false });
        setValue('caracteristiques.volume_3_l', undefined, { shouldValidate: false });
      }
    } catch {}
  }, [profondeurTotale, niveauEau, diametre, diametreAutre, setValue]);

  return null;
};

// --- Composant pour le calcul de la durée ---
const AutoCalculatedDuration = ({ control, setValue }: { control: Control<GroundwaterSurveyFormData>, setValue: Function }) => {
  const [heureDebut, heureFin] = useWatch({
    control,
    name: ["echantillonnage.heure_debut", "echantillonnage.heure_fin"]
  });

  useEffect(() => {
    try {
      if (heureDebut && heureFin) {
        const [hdH, hdM] = heureDebut.split(':').map(Number);
        const [hfH, hfM] = heureFin.split(':').map(Number);
        
        const debutMinutes = hdH * 60 + hdM;
        const finMinutes = hfH * 60 + hfM;
        
        let dureeMinutes = finMinutes - debutMinutes;
        
        // Gérer le cas où on passe minuit
        if (dureeMinutes < 0) {
          dureeMinutes += 24 * 60;
        }
        
        const dureeRounded = Math.round(dureeMinutes * 1000) / 1000; // Arrondi à 3 décimales
        setValue('echantillonnage.duree_minutes', dureeRounded, { shouldValidate: false });
      } else {
        setValue('echantillonnage.duree_minutes', undefined, { shouldValidate: false });
      }
    } catch {}
  }, [heureDebut, heureFin, setValue]);

  return null;
};

export function GroundwaterSurveyForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);
  const photoPiezometre = useSurveyPhotoField();
  const { setPersistedUrl: setPhotoPiezometreUrl } = photoPiezometre;

  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();
  const { data: preleveurs = [] } = useUsers({
    includeHistoricalPreleveurs: true,
    restrictToAllowedFieldUsers: true,
  });
  const { isDesktop } = useDeviceContext();
  const { generatePdf, isGenerating } = usePdfGenerator();

  const { register, handleSubmit, control, formState: { errors, isDirty }, reset, setValue, watch } = useForm<GroundwaterSurveyFormData>({
    resolver: zodResolver(GroundwaterSurveySchema),
    defaultValues: {
      nom_ouvrage: '',
      numero_affaire: '',
      client: '',
      commune: '',
      preleveur: '',
      coordonnees: {
        latitude: undefined,
        longitude: undefined,
        altitude: undefined,
      },
        date: getLocalDateString(),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      temperature_air: undefined,
      date_dernieres_pluies: getLocalDateString(),
      meteo: 'Ensoleillé',
      periode_concernee: 'Hautes eaux',
      description_piezometre: {
        etat: 'Bon',
        type_ouvrage: '',
        usage: '',
        etat_tete: {
          capot_protection: false,
          margelle: false,
          cadenas: false,
          tubage: false,
        },
        photographie_url: '',
      },
      caracteristiques: {},
      detection_composes: {},
      purge: {
        materiel: 'Bailer',
        materiaux_tuyaux: 'PVC',
        type: 'Statique',
        traitement_eau: {
          charbon_actif: false,
          autre: false,
        },
      },
      echantillonnage: {
        materiel: 'Bailer',
        nettoyage_materiel: 'Eau claire',
        date_prelevement: getLocalDateString(),
        heure_debut: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        heure_fin: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
      parametres: {
        temperature: { purge: '', prelevement: '' },
        conductivite: { purge: '', prelevement: '' },
        ph: { purge: '', prelevement: '' },
        redox: { purge: '', prelevement: '' },
        turbidite: { purge: '', prelevement: '' },
        irisation: { purge: '', prelevement: '' },
        odeur: { purge: '', prelevement: '' },
        couleur: { purge: '', prelevement: '' },
        remarques: { purge: '', prelevement: '' },
        pid: { purge: '', prelevement: '' },
      },
      conditionnement: {
        date_depot: getLocalDateString(),
        date_envoi: getLocalDateString(),
        type_conditionnement: undefined,
        laboratoire: undefined,
        transporteur: undefined,
        transporteur_autre: '',
        substances: {
          hct: false,
          hap: false,
          btex: false,
          cohv: false,
          pcb: false,
          metaux: false,
          pesticides: false,
          pfas: false,
          phenol: false,
          autre: false,
        },
        substances_autre_details: '',
      },
    },
  });

  // Pré-remplir les champs depuis les données du site (cohérence métier).
  useEffect(() => {
    if (!siteData) return;
    if (siteData.project_number) setValue('numero_affaire', siteData.project_number);
    if (siteData.name) setValue('client', siteData.name);
    if (siteData.city) setValue('commune', siteData.city);
  }, [siteData, setValue]);

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const loadedData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (loadedData) {
            const formData: any = { ...loadedData };
            
            // Gérer la compatibilité avec les anciennes données pour conditionnement
            if (formData.conditionnement) {
              const validTypeConditionnement = ['Transparent (450mL)', 'Brun (350mL)'];
              if (formData.conditionnement.type_conditionnement && 
                  typeof formData.conditionnement.type_conditionnement === 'string' && 
                  !validTypeConditionnement.includes(formData.conditionnement.type_conditionnement)) {
                // Si la valeur n'est pas valide, la mettre à undefined
                formData.conditionnement.type_conditionnement = undefined;
              }
              // Compatibilité ascendante : l'ancien laboratoire "Wessling" est devenu "ALS France".
              if (formData.conditionnement.laboratoire === 'Wessling') {
                formData.conditionnement.laboratoire = 'ALS France';
              }
              const validLaboratoires = ['ALS France', 'Eurofins', 'Agrolab'];
              if (formData.conditionnement.laboratoire && 
                  typeof formData.conditionnement.laboratoire === 'string' && 
                  !validLaboratoires.includes(formData.conditionnement.laboratoire)) {
                // Si la valeur n'est pas valide, la mettre à undefined
                formData.conditionnement.laboratoire = undefined;
              }
              // Gérer la compatibilité avec les anciennes données pour transporteur
              const validTransporteurs = ['UPS', 'Navette', 'Autre'];
              if (formData.conditionnement.transporteur && 
                  typeof formData.conditionnement.transporteur === 'string' && 
                  !validTransporteurs.includes(formData.conditionnement.transporteur)) {
                // Si la valeur n'est pas valide, la mettre dans "Autre"
                formData.conditionnement.transporteur_autre = formData.conditionnement.transporteur;
                formData.conditionnement.transporteur = 'Autre';
              }
            }
            
            reset(formData as GroundwaterSurveyFormData);
            setPhotoPiezometreUrl(formData.description_piezometre?.photographie_url);
          }
        } catch (err) {
          setError("Impossible de charger les données de la fiche.");
        } finally {
          setLoading(false);
        }
      };
      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData, setPhotoPiezometreUrl]);

  const onSubmitInternal = async (formData: GroundwaterSurveyFormData, shouldNavigate = true) => {
    setLoading(true);
    setError('');
    try {
      // Téléversement de la photo si un nouveau fichier a été sélectionné.
      // Hors ligne (ou échec réseau), le binaire part en queue IndexedDB et le
      // rejeu renseignera `description_piezometre.photographie_url`.
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const photosForQueue: OfflinePhotoInput[] = [];

      if (photoPiezometre.file) {
        let uploaded = false;
        if (!isOffline) {
          try {
            const publicUrl = await uploadSurveyPhoto({
              file: photoPiezometre.file,
              siteId: siteId ?? null,
              surveyType: 'groundwater',
              fieldSuffix: 'piezometre',
            });
            formData.description_piezometre.photographie_url = publicUrl;
            photoPiezometre.markUploaded(publicUrl);
            uploaded = true;
          } catch (photoErr) {
            if (!isLikelyNetworkError(photoErr)) throw photoErr;
          }
        }

        if (!uploaded) {
          formData.description_piezometre.photographie_url = '';
          photosForQueue.push({
            file: photoPiezometre.file,
            fieldPath: 'description_piezometre.photographie_url',
          });
        }
      }
      if (siteData?.project_number) formData.numero_affaire = siteData.project_number || formData.numero_affaire;
      if (siteData?.name) formData.client = siteData.name || formData.client;
      if (siteData?.city) formData.commune = siteData.city || formData.commune;

      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'groundwater',
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData: formData,
        photos: photosForQueue,
      });

      reset(formData, { keepValues: true });

      if (result.status === 'pending') {
        showToast(
          'warning',
          "Synchronisation en attente — la fiche sera envoyée dès le retour du réseau.",
          0,
          'sync-queue-banner',
        );
      }

      if (shouldNavigate) {
        navigate(`/sites/${siteId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<GroundwaterSurveyFormData> = async (formData) => {
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
      await generatePdf('groundwater', formData as GroundwaterSurveyFormData, siteData?.name || '', siteId || undefined);
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde/génération PDF:', err);
      showToast('error', 'Erreur lors de la sauvegarde ou de la génération du PDF');
    }
  };

  // Protection contre la navigation sans sauvegarde
  // Ne pas bloquer pendant le chargement ou la génération du PDF
  const navigationBlockerDialog = useNavigationBlocker({
    shouldBlock: isDirty && !loading && !isGenerating('groundwater'),
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
      if (isDirty && !loading && !isGenerating('groundwater')) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, loading, isGenerating]);

  // Observateurs pour la logique conditionnelle
  const capotProtection = watch('description_piezometre.etat_tete.capot_protection');
  const preleveurValue = watch('preleveur');
  const preleveurOptions = withPreservedUserSelection(preleveurs, preleveurValue);
  const tubage = watch('description_piezometre.etat_tete.tubage');
  const typeTubage = watch('description_piezometre.etat_tete.type_tubage');
  const diametre = watch('caracteristiques.diametre');
  const traitementAutre = watch('purge.traitement_eau.autre');
  const nettoyageMateriel = watch('echantillonnage.nettoyage_materiel');
  const purgeMateriel = watch('purge.materiel');
  const echantillonnageMateriel = watch('echantillonnage.materiel');
  const substancesAutre = watch('conditionnement.substances.autre');
  const transporteur = watch('conditionnement.transporteur');

  const sections = [
    { id: 'section-en-tete', number: 1, title: 'En-tête & Localisation', icon: Building2 },
    { id: 'section-description', number: 2, title: 'Description du piézomètre', icon: Droplet },
    { id: 'section-caracteristiques', number: 3, title: 'Caractéristiques de l\'ouvrage', icon: Wrench },
    { id: 'section-detection', number: 4, title: 'Détection de composés', icon: TestTube },
    { id: 'section-purge', number: 5, title: 'Purge', icon: Gauge },
    { id: 'section-echantillonnage', number: 6, title: 'Prélèvement', icon: Droplet },
    { id: 'section-parametres', number: 7, title: 'Paramètres physico-chimiques', icon: FileText },
    { id: 'section-conditionnement', number: 8, title: 'Conditionnement & Transport', icon: FileText },
  ];

  return (
    <>
      {navigationBlockerDialog}
      <FormPageLayout
        siteId={siteId!}
        title="Fiche Prélèvement Eaux Souterraines"
      subtitle="Enregistrement des données de prélèvement d'eaux souterraines"
      sidebar={
        <FormSidebar
          sections={sections}
          loading={loading}
          formId="groundwater-survey-form"
          onGeneratePdf={saveAndGeneratePdf}
          isGeneratingPdf={isGenerating('groundwater')}
        />
      }
    >
      <AutoCalculatedVolumes control={control} setValue={setValue} />
      <AutoCalculatedDuration control={control} setValue={setValue} />
      
      <form id="groundwater-survey-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        {/* Section 1: En-tête & Localisation */}
        <FormSection id="section-en-tete" number={1} title="En-tête & Localisation" icon={Building2}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="nom_ouvrage"
              label="Nom de l'ouvrage"
              placeholder="PZ-001"
              errors={errors}
              isRequired
            />
            {/* numero_affaire, client et commune sont cachés - pré-remplis automatiquement depuis le site */}
            <input type="hidden" {...register("numero_affaire")} />
            <input type="hidden" {...register("client")} />
            <input type="hidden" {...register("commune")} />
            <SelectField
              register={register}
              name="preleveur"
              label="Préleveur"
              options={preleveurOptions.map(p => ({ value: p, label: p }))}
              errors={errors}
              isRequired
            />
            <InputField
              register={register}
              name="date"
              label="Date"
              type="date"
              errors={errors}
              isRequired
            />
            <InputField
              register={register}
              name="heure"
              label="Heure"
              type="time"
              errors={errors}
              isRequired
            />
            <InputField
              register={register}
              name="temperature_air"
              label="Température air (°C)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="date_dernieres_pluies"
              label="Date dernières pluies"
              type="date"
              errors={errors}
            />
            <div className="sm:col-span-2">
              <RadioCardField
                name="meteo"
                label="Météo"
                register={register}
                watch={watch}
                errors={errors}
                options={[...METEO_OPTIONS]}
                columns={4}
                isRequired
              />
            </div>
            <div className="sm:col-span-2">
              <RadioCardField
                name="periode_concernee"
                label="Période concernée"
                register={register}
                watch={watch}
                errors={errors}
                options={[...PERIODE_OPTIONS]}
                columns={2}
                isRequired
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground">Coordonnées GPS</h3>
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
                      Remplir avec la position actuelle
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <InputField
                  register={register}
                  name="coordonnees.latitude"
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="coordonnees.longitude"
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="coordonnees.altitude"
                  label="Altitude"
                  type="number"
                  step="0.01"
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section 2: Description du piézomètre */}
        <FormSection id="section-description" number={2} title="Description du piézomètre" icon={Droplet}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <RadioCardField
              name="description_piezometre.etat"
              label="État"
              register={register}
              watch={watch}
              errors={errors}
              options={[...ETAT_OPTIONS]}
              columns={2}
              isRequired
            />
            <InputField
              register={register}
              name="description_piezometre.type_ouvrage"
              label="Type d'ouvrage"
              errors={errors}
            />
            <InputField
              register={register}
              name="description_piezometre.usage"
              label="Usage"
              errors={errors}
            />
            <div className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <CheckboxField
                register={register}
                  name="description_piezometre.etat_tete.capot_protection"
                label="Capot protection"
                errors={errors}
              />
              <CheckboxField
                register={register}
                  name="description_piezometre.etat_tete.margelle"
                label="Margelle"
                errors={errors}
              />
              <CheckboxField
                register={register}
                  name="description_piezometre.etat_tete.cadenas"
                  label="Cadenas"
                errors={errors}
              />
              <CheckboxField
                register={register}
                  name="description_piezometre.etat_tete.tubage"
                  label="Tubage"
                errors={errors}
              />
              </div>
            </div>
            
            {capotProtection && (
              <div className="sm:col-span-2">
                <RadioCardField
                  name="description_piezometre.etat_tete.type_capot"
                  label="Type de capot"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[...TYPE_CAPOT_OPTIONS]}
                  columns={2}
                />
              </div>
            )}
            
            {tubage && (
              <div className="sm:col-span-2">
                <RadioCardField
                  name="description_piezometre.etat_tete.type_tubage"
                  label="Type de tubage"
                  register={register}
                  watch={watch}
                  errors={errors}
                  options={[...TYPE_TUBAGE_OPTIONS]}
                  columns={3}
                />
                {typeTubage === 'Autre' && (
                  <InputField
                    register={register}
                    name="description_piezometre.etat_tete.type_tubage_autre"
                    label="Préciser le type de tubage"
                    errors={errors}
                    className="mt-4"
                  />
                )}
              </div>
            )}
            
            <div className="sm:col-span-2">
              <PhotoPickerField
                label="Photographie du piézomètre"
                onPhotoSelected={(file, source) => {
                  void photoPiezometre.selectPhoto(file, source);
                }}
              >
                {photoPiezometre.previewUrl && (
                  <div className="mt-2 space-y-2">
                    <SafeSurveyImage
                      src={photoPiezometre.previewUrl}
                      alt="Aperçu de la photo"
                      className="h-32 w-32 object-cover rounded-lg border"
                      isLocallyCreated={photoPiezometre.isLocalPreview}
                    />
                    {!photoPiezometre.file && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Image actuelle. Sélectionnez un nouveau fichier pour la remplacer.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            photoPiezometre.clearPhoto();
                            setValue('description_piezometre.photographie_url', '');
                          }}
                          className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Supprimer l'image
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </PhotoPickerField>
            </div>
          </div>
        </FormSection>

        {/* Section 3: Caractéristiques de l'ouvrage */}
        <FormSection id="section-caracteristiques" number={3} title="Caractéristiques de l'ouvrage" icon={Wrench}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RadioCardField
                name="caracteristiques.diametre"
                label="Diamètre"
                register={register}
                watch={watch}
                errors={errors}
                options={[...DIAMETRE_OPTIONS]}
                columns={3}
              />
              {diametre === 'autre' && (
                <InputField
                  register={register}
                  name="caracteristiques.diametre_autre"
                  label="Préciser le diamètre (mm)"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Ex: 40"
                  errors={errors}
                  className="mt-4"
                />
              )}
            </div>
            <InputField
              register={register}
              name="caracteristiques.hauteur_capot_m"
              label="Hauteur capot (m/sol TN)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <InputField
              register={register}
              name="caracteristiques.profondeur_totale_m"
              label="Profondeur totale (m/sol TN)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <InputField
              register={register}
              name="caracteristiques.hauteur_crepine_m"
              label="Hauteur crépine (m)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <InputField
              register={register}
              name="caracteristiques.niveau_eau_m"
              label="Niveau piézométrique (m/sol TN)"
              type="number"
              step="0.01"
              errors={errors}
            />
            
            {/* Section des calculs automatiques */}
            <div className="sm:col-span-2 border-2 border-primary/30 dark:border-primary/40 rounded-lg p-4 bg-primary/5 dark:bg-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  Calculs automatiques
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <InputField
                  register={register}
                  name="caracteristiques.hauteur_colonne_eau_m"
                  label="Hauteur colonne d'eau (m)"
                  type="number"
                  step="0.001"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="caracteristiques.volume_eau_l"
                  label="Volume d'eau (L)"
                  type="number"
                  step="0.001"
                  errors={errors}
                />
                <InputField
                  register={register}
                  name="caracteristiques.volume_3_l"
                  label="Volume minimum à purger 3 volumes (L)"
                  type="number"
                  step="0.001"
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section 4: Détection de composés */}
        <FormSection id="section-detection" number={4} title="Détection de composés" icon={TestTube}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="detection_composes.pid_ouverture_ppm"
              label="PID à l'ouverture (ppm)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="detection_composes.presence_flottants_cm"
              label="Présence flottants (cm)"
              type="number"
              step="0.1"
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Section 5: Purge */}
        <FormSection id="section-purge" number={5} title="Purge" icon={Gauge}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RadioCardField
                name="purge.materiel"
                label="Matériel"
                register={register}
                watch={watch}
                errors={errors}
                options={[...MATERIEL_OPTIONS]}
                columns={3}
                isRequired
              />
              {purgeMateriel === 'Autre' && (
                <InputField
                  register={register}
                  name="purge.materiel_autre"
                  label="Préciser le matériel de purge"
                  errors={errors}
                  className="mt-4"
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <RadioCardField
                name="purge.materiaux_tuyaux"
                label="Matériaux tuyaux"
                register={register}
                watch={watch}
                errors={errors}
                options={[...MATERIAUX_TUYAUX_OPTIONS]}
                columns={2}
                isRequired
              />
            </div>
            <div className="sm:col-span-2">
              <RadioCardField
                name="purge.type"
                label="Type"
                register={register}
                watch={watch}
                errors={errors}
                options={[...TYPE_PURGE_OPTIONS]}
                columns={2}
                isRequired
              />
            </div>
            <InputField
              register={register}
              name="purge.debit_debut_l_min"
              label="Débit début (l/min)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="purge.debit_fin_l_min"
              label="Débit fin (l/min)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="purge.debit_moyen_l_min"
              label="Débit moyen (l/min)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="purge.position_pompe_m"
              label="Position pompe (m/sol TN)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <InputField
              register={register}
              name="purge.rabattement_m"
              label="Rabattement (m)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <div className="sm:col-span-2">
              <CheckboxCardField
                name="purge.traitement_eau"
                label="Traitement eau"
                register={register}
                watch={watch}
                errors={errors}
                options={[...TRAITEMENT_EAU_OPTIONS]}
                columns={2}
              />
              {traitementAutre && (
                <InputField
                  register={register}
                  name="purge.traitement_eau.autre_details"
                  label="Préciser le traitement"
                  errors={errors}
                  className="mt-4"
                />
              )}
            </div>
            <InputField
              register={register}
              name="purge.volume_purge_l"
              label="Volume purge (L)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="purge.exutoire_rejet"
              label="Exutoire rejet"
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Section 6: Prélèvement */}
        <FormSection id="section-echantillonnage" number={6} title="Prélèvement" icon={Droplet}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <RadioCardField
                name="echantillonnage.nettoyage_materiel"
                label="Nettoyage matériel"
                register={register}
                watch={watch}
                errors={errors}
                options={[...NETTOYAGE_OPTIONS]}
                columns={3}
                isRequired
              />
            </div>
            {nettoyageMateriel === 'Autre' && (
              <div className="sm:col-span-2">
                <InputField
                  register={register}
                  name="echantillonnage.nettoyage_autre_details"
                  label="Préciser le nettoyage"
                  errors={errors}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <RadioCardField
                name="echantillonnage.materiel"
                label="Matériel"
                register={register}
                watch={watch}
                errors={errors}
                options={[...MATERIEL_OPTIONS]}
                columns={3}
                isRequired
              />
              {echantillonnageMateriel === 'Autre' && (
                <InputField
                  register={register}
                  name="echantillonnage.materiel_autre"
                  label="Préciser le matériel de prélèvement"
                  errors={errors}
                  className="mt-4"
                />
              )}
            </div>
            <InputField
              register={register}
              name="echantillonnage.date_prelevement"
              label="Date prélèvement"
              type="date"
              errors={errors}
            />
            <InputField
              register={register}
              name="echantillonnage.heure_debut"
              label="Heure début"
              type="time"
              errors={errors}
            />
            <InputField
              register={register}
              name="echantillonnage.heure_fin"
              label="Heure fin"
              type="time"
              errors={errors}
            />
            
            {/* Section du calcul automatique de la durée */}
            <div className="sm:col-span-2 border-2 border-primary/30 dark:border-primary/40 rounded-lg p-4 bg-primary/5 dark:bg-primary/10">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  Calcul automatique
                </h4>
              </div>
              <InputField
                register={register}
                name="echantillonnage.duree_minutes"
                label="Durée (minutes)"
                type="number"
                step="0.001"
                errors={errors}
              />
            </div>
            
            <InputField
              register={register}
              name="echantillonnage.debit_l_min"
              label="Débit de pompage (l/min)"
              type="number"
              step="0.1"
              errors={errors}
            />
            <InputField
              register={register}
              name="echantillonnage.position_pompe_m"
              label="Position pompe (m/repère)"
              type="number"
              step="0.01"
              errors={errors}
            />
            <InputField
              register={register}
              name="echantillonnage.niveau_prelevement_m"
              label="Niveau prélèvement (m/repère)"
              type="number"
              step="0.01"
              errors={errors}
            />
          </div>
        </FormSection>
        
        {/* Section 7: Paramètres physico-chimiques */}
        <FormSection id="section-parametres" number={7} title="Paramètres physico-chimiques" icon={FileText}>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-surface-300 dark:border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Paramètre</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Purge</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Prélèvement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300 dark:divide-white/10">
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Température (°C)</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.temperature.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.temperature.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Conductivité (µS/cm)</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.conductivite.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.conductivite.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">pH</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.ph.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.ph.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Redox (mV)</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.redox.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.redox.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Turbidité (NTU)</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.turbidite.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.turbidite.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Irisation</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.irisation.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.irisation.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Odeur</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.odeur.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.odeur.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Couleur</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.couleur.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.couleur.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">Remarques</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.remarques.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.remarques.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          {...field}
                          value={field.value || ''}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-foreground">PID (ppmV)</td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.pid.purge"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Controller
                      name="parametres.pid.prelevement"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-surface-300 dark:border-white/10 rounded-md bg-background dark:bg-surface-200 text-foreground"
                        />
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FormSection>

        {/* Section 8: Conditionnement & Transport */}
        <FormSection id="section-conditionnement" number={8} title="Conditionnement & Transport" icon={FileText}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              register={register}
              name="conditionnement.date_depot"
              label="Date dépôt"
              type="date"
              errors={errors}
            />
            <InputField
              register={register}
              name="conditionnement.date_envoi"
              label="Date envoi"
              type="date"
              errors={errors}
            />
            <div className="sm:col-span-2">
              <RadioCardField
                name="conditionnement.type_conditionnement"
                label="Type de conditionnement"
                register={register}
                watch={watch}
                errors={errors}
                options={[...TYPE_FLACONNAGE_OPTIONS]}
                columns={2}
              />
            </div>
            <div className="sm:col-span-2">
              <RadioCardField
                name="conditionnement.laboratoire"
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
                name="conditionnement.transporteur"
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
                    register={register}
                    name="conditionnement.transporteur_autre"
                    label="Préciser le transporteur"
                    errors={errors}
                    placeholder="Saisir le transporteur"
                  />
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground dark:text-white mb-4">
                Substances recherchées
              </label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SUBSTANCES_OPTIONS.map(substance => (
                <div key={substance.value} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                      {...register(`conditionnement.substances.${substance.value}`)} 
                    className="h-4 w-4 rounded" 
                  />
                  <label className="text-sm text-foreground dark:text-white">{substance.label}</label>
                </div>
              ))}
            </div>
              {substancesAutre && (
                <InputField
                  register={register}
                  name="conditionnement.substances_autre_details"
                  label="Préciser les substances"
                  errors={errors}
                  className="mt-4"
                />
              )}
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
                  disabled={isGenerating('groundwater') || loading}
                  className="hidden lg:inline-flex w-full sm:w-auto min-w-[200px]"
                >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating('groundwater') ? 'Génération...' : 'Télécharger le PDF'}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || isGenerating('groundwater')}
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