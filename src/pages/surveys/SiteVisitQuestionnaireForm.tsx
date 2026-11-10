import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { SiteVisitQuestionnaireSchema, SiteVisitQuestionnaire } from '../../schema/siteVisitQuestionnaireSchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { getLocalDateString } from '../../lib/utils';

export function SiteVisitQuestionnaireForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SiteVisitQuestionnaire>({
    resolver: zodResolver(SiteVisitQuestionnaireSchema),
    defaultValues: {
      nom_visite: '',
      date: getLocalDateString(),
      personne_contact_sur_site: '',
      historique_activites: {
        activite_actuelle: '',
        activites_anterieures: '',
        incidents_connus: '',
      },
      observations_visuelles: {
        sols_taches: false,
        odeurs: false,
        vegetation_impactee: false,
        presence_dechets: false,
        presence_remblais: false,
        autres_observations: '',
      },
      stockages: {
        cuves_aeriennes: false,
        cuves_enterrees: false,
        fut_conteneurs: false,
        stockage_produits_chimiques: false,
        details_stockages: '',
      },
      reseaux_et_ouvrages: {
        presence_puits: false,
        presence_piezometres: false,
        reseaux_enterres_visibles: false,
        details_ouvrages: '',
      },
      environnement_proche: {
        voisinage_immediat: '',
        contexte_hydrogeologique: '',
      },
      documents_consultes: {
        plans_site: false,
        fiches_donnees_securite: false,
        rapports_anterieurs: false,
      },
    },
  });

  // Charger les données existantes en mode édition
  useEffect(() => {
    const loadSurveyData = async () => {
      if (isEditMode && surveyId) {
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData);
          }
        } catch (err) {
          console.error('Erreur lors du chargement des données:', err);
          setError('Erreur lors du chargement des données du formulaire');
        }
      }
    };

    loadSurveyData();
  }, [isEditMode, surveyId, reset, siteData]);

  const onSubmit: SubmitHandler<SiteVisitQuestionnaire> = async (formData) => {
    if (!user || !siteId) return;

    setLoading(true);
    setError('');

    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'site_visit',
        siteId: siteId,
        createdBy: user.id,
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
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Erreur lors de la sauvegarde du questionnaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPageLayout
      title={isEditMode ? 'Modifier le Questionnaire de Visite' : 'Nouveau Questionnaire de Visite'}
      subtitle="Questionnaire de visite de site industriel"
      error={error}
      onBack={`/sites/${siteId}`}
    >
      <DevelopmentBanner className="mb-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Informations générales */}
        <FormSection title="Informations générales" number={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              {...register('nom_visite')}
              label="Nom de la visite"
              placeholder="Ex: Visite initiale site industriel"
              error={errors.nom_visite?.message}
              isRequired
            />
            <InputField
              {...register('date')}
              type="date"
              label="Date de la visite"
            />
            <div className="md:col-span-2">
              <InputField
                {...register('personne_contact_sur_site')}
                label="Personne de contact sur site"
                placeholder="Nom et fonction de la personne contact"
              />
            </div>
          </div>
        </FormSection>

        {/* Historique des activités */}
        <FormSection title="Historique des activités" number={2}>
          <div className="space-y-4">
            <InputField
              {...register('historique_activites.activite_actuelle')}
              label="Activité actuelle"
              placeholder="Description de l'activité actuelle sur le site"
            />
            <TextareaField
              {...register('historique_activites.activites_anterieures')}
              label="Activités antérieures"
              placeholder="Historique des activités passées sur le site"
              rows={3}
            />
            <TextareaField
              {...register('historique_activites.incidents_connus')}
              label="Incidents connus"
              placeholder="Description des incidents ou accidents connus"
              rows={3}
            />
          </div>
        </FormSection>

        {/* Observations visuelles */}
        <FormSection title="Observations visuelles" number={3}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckboxField
                {...register('observations_visuelles.sols_taches')}
                label="Sols avec taches ou décolorations"
              />
              <CheckboxField
                {...register('observations_visuelles.odeurs')}
                label="Odeurs anormales"
              />
              <CheckboxField
                {...register('observations_visuelles.vegetation_impactee')}
                label="Végétation impactée"
              />
              <CheckboxField
                {...register('observations_visuelles.presence_dechets')}
                label="Présence de déchets"
              />
              <CheckboxField
                {...register('observations_visuelles.presence_remblais')}
                label="Présence de remblais"
              />
            </div>
            <TextareaField
              {...register('observations_visuelles.autres_observations')}
              label="Autres observations"
              placeholder="Autres observations visuelles notables"
              rows={3}
            />
          </div>
        </FormSection>

        {/* Stockages */}
        <FormSection title="Stockages" number={4}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckboxField
                {...register('stockages.cuves_aeriennes')}
                label="Cuves aériennes"
              />
              <CheckboxField
                {...register('stockages.cuves_enterrees')}
                label="Cuves enterrées"
              />
              <CheckboxField
                {...register('stockages.fut_conteneurs')}
                label="Fûts et conteneurs"
              />
              <CheckboxField
                {...register('stockages.stockage_produits_chimiques')}
                label="Stockage de produits chimiques"
              />
            </div>
            <TextareaField
              {...register('stockages.details_stockages')}
              label="Détails des stockages"
              placeholder="Description détaillée des stockages observés"
              rows={3}
            />
          </div>
        </FormSection>

        {/* Réseaux et ouvrages */}
        <FormSection title="Réseaux et ouvrages" number={5}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckboxField
                {...register('reseaux_et_ouvrages.presence_puits')}
                label="Présence de puits"
              />
              <CheckboxField
                {...register('reseaux_et_ouvrages.presence_piezometres')}
                label="Présence de piézomètres"
              />
              <CheckboxField
                {...register('reseaux_et_ouvrages.reseaux_enterres_visibles')}
                label="Réseaux enterrés visibles"
              />
            </div>
            <TextareaField
              {...register('reseaux_et_ouvrages.details_ouvrages')}
              label="Détails des ouvrages"
              placeholder="Description des réseaux et ouvrages observés"
              rows={3}
            />
          </div>
        </FormSection>

        {/* Environnement proche */}
        <FormSection title="Environnement proche" number={6}>
          <div className="space-y-4">
            <TextareaField
              {...register('environnement_proche.voisinage_immediat')}
              label="Voisinage immédiat"
              placeholder="Ex: Zone résidentielle au nord, station-service à l'est"
              rows={3}
            />
            <InputField
              {...register('environnement_proche.contexte_hydrogeologique')}
              label="Contexte hydrogéologique"
              placeholder="Description du contexte hydrogéologique"
            />
          </div>
        </FormSection>

        {/* Documents consultés */}
        <FormSection title="Documents consultés" number={7}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CheckboxField
              {...register('documents_consultes.plans_site')}
              label="Plans du site"
            />
            <CheckboxField
              {...register('documents_consultes.fiches_donnees_securite')}
              label="Fiches de données de sécurité"
            />
            <CheckboxField
              {...register('documents_consultes.rapports_anterieurs')}
              label="Rapports antérieurs"
            />
          </div>
        </FormSection>

        <div className="flex justify-center sm:justify-end items-start pt-8">
          <SubmitButton
            loading={loading}
            text="Enregistrer le questionnaire"
            className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3"
          />
        </div>
      </form>
    </FormPageLayout>
  );
}
