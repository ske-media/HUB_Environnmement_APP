import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { GardenQuestionnaireSchema, type GardenQuestionnaire } from '../../schema/gardenQuestionnaireSchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { getLocalDateString } from '../../lib/utils';

export function GardenQuestionnaireForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<GardenQuestionnaire>({
    resolver: zodResolver(GardenQuestionnaireSchema),
    defaultValues: {
      adresse_jardin: '',
      date_enquete: getLocalDateString(),
      nom_enqueteur: '',
      occupants: {
        nombre_adultes: 0,
        nombre_enfants: 0,
        animaux_domestiques: false
      },
      usage_jardin: {
        presence_potager: false,
        types_legumes_cultives: '',
        utilisation_compost: false,
        presence_jeux_enfants: false,
        presence_piscine: false
      },
      gestion_eau: {
        source_arrosage: 'Robinet',
        details_puits: ''
      },
      historique_parcelle: {
        connaissance_usage_anterieur: '',
        apport_terres_exterieures: false,
        details_apport_terres: ''
      },
      observations_generales: ''
    },
  });

  // Surveiller les valeurs pour les champs conditionnels
  const sourceArrosage = watch('gestion_eau.source_arrosage');
  const presencePotager = watch('usage_jardin.presence_potager');
  const apportTerres = watch('historique_parcelle.apport_terres_exterieures');

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as GardenQuestionnaire);
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

  const onSubmit: SubmitHandler<GardenQuestionnaire> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'garden_questionnaire',
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
      title={`${isEditMode ? 'Modifier' : 'Nouveau'} Questionnaire Jardin`}
      subtitle="Enquête sur l'usage et l'historique du jardin"
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InputField
                name="adresse_jardin"
                label="Adresse du jardin"
                register={register}
                errors={errors}
                placeholder="Adresse complète du jardin"
                isRequired={true}
              />
              <InputField
                name="date_enquete"
                label="Date d'enquête"
                register={register}
                errors={errors}
                type="date"
              />
              <div className="sm:col-span-2">
                <InputField
                  name="nom_enqueteur"
                  label="Nom de l'enquêteur"
                  register={register}
                  errors={errors}
                  placeholder="Nom et prénom de l'enquêteur"
                />
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 2 : OCCUPANTS --- */}
          <FormSection number={2} title="Occupants">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <InputField
                name="occupants.nombre_adultes"
                label="Nombre d'adultes"
                register={register}
                errors={errors}
                type="number"
              />
              <InputField
                name="occupants.nombre_enfants"
                label="Nombre d'enfants"
                register={register}
                errors={errors}
                type="number"
              />
              <div className="flex items-center">
                <CheckboxField
                  name="occupants.animaux_domestiques"
                  label="Animaux domestiques"
                  register={register}
                />
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 3 : USAGE DU JARDIN --- */}
          <FormSection number={3} title="Usage du jardin">
            <div className="space-y-6">
              <CheckboxField
                name="usage_jardin.presence_potager"
                label="Présence d'un potager"
                register={register}
              />

              {presencePotager && (
                <TextareaField
                  name="usage_jardin.types_legumes_cultives"
                  label="Types de légumes cultivés"
                  register={register}
                  errors={errors}
                  rows={3}
                  placeholder="Décrivez les légumes cultivés..."
                />
              )}

              <CheckboxField
                name="usage_jardin.utilisation_compost"
                label="Utilisation de compost"
                register={register}
              />

              <CheckboxField
                name="usage_jardin.presence_jeux_enfants"
                label="Présence de jeux d'enfants (ex: bac à sable)"
                register={register}
              />

              <CheckboxField
                name="usage_jardin.presence_piscine"
                label="Présence d'une piscine"
                register={register}
              />
            </div>
          </FormSection>

          {/* --- SECTION 4 : GESTION DE L'EAU --- */}
          <FormSection number={4} title="Gestion de l'eau">
            <div className="space-y-6">
              <SelectField
                name="gestion_eau.source_arrosage"
                label="Source d'arrosage"
                register={register}
                errors={errors}
                options={[
                  { value: 'Robinet', label: 'Robinet' },
                  { value: 'Puits', label: 'Puits' },
                  { value: 'Récupération pluie', label: 'Récupération pluie' }
                ]}
              />

              {sourceArrosage === 'Puits' && (
                <TextareaField
                  name="gestion_eau.details_puits"
                  label="Détails sur le puits"
                  register={register}
                  errors={errors}
                  rows={3}
                  placeholder="Décrivez le puits (profondeur, type, etc.)..."
                />
              )}
            </div>
          </FormSection>

          {/* --- SECTION 5 : HISTORIQUE DE LA PARCELLE --- */}
          <FormSection number={5} title="Historique de la parcelle">
            <div className="space-y-6">
              <TextareaField
                name="historique_parcelle.connaissance_usage_anterieur"
                label="Connaissance de l'usage antérieur"
                register={register}
                errors={errors}
                rows={3}
                placeholder="Décrivez ce que vous savez de l'usage antérieur de cette parcelle..."
              />

              <CheckboxField
                name="historique_parcelle.apport_terres_exterieures"
                label="Apport de terres extérieures"
                register={register}
              />

              {apportTerres && (
                <TextareaField
                  name="historique_parcelle.details_apport_terres"
                  label="Détails sur l'apport de terres"
                  register={register}
                  errors={errors}
                  rows={3}
                  placeholder="Décrivez l'origine et les détails de l'apport de terres..."
                />
              )}
            </div>
          </FormSection>

          {/* --- SECTION 6 : OBSERVATIONS GÉNÉRALES --- */}
          <FormSection number={6} title="Observations générales">
            <TextareaField
              name="observations_generales"
              label="Observations générales"
              register={register}
              errors={errors}
              rows={4}
              placeholder="Toute observation supplémentaire sur le jardin et son environnement..."
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
