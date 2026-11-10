import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { RiskAnalysisSchema, RiskAnalysis } from '../../schema/riskAnalysisSchema';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { useSiteDataForSurvey } from '../../hooks/useSiteDataForSurvey';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { CheckboxField } from '../../components/forms/fields/CheckboxField';
import { SubmitButton } from '../../components/forms/SubmitButton';

export function RiskAnalysisForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { siteData } = useSiteDataForSurvey(siteId);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<RiskAnalysis>({
    resolver: zodResolver(RiskAnalysisSchema),
    defaultValues: {
      prestations: {
        visite_site: false,
        sondages_sol: false,
        prelevements_sol: false,
        prelevements_eau: false,
        prelevements_air: false,
        analyses_laboratoire: false,
        etude_documentaire: false,
        autres: '',
      },
      transport: {
        distance_km: 0,
        duree_estimee_heures: 0,
        moyen_transport: 'Véhicule léger',
        conducteur: '',
        passagers: [],
      },
      risques_terrain: [
        { type_risque: '', description: '', probabilite: 'Faible', gravite: 'Faible', mesures_prevention: '', responsable: '' },
      ],
      revetements: {
        amiante: {
          presence: false,
          localisation: '',
          etat: 'Bon',
          mesures: '',
        },
        hap: {
          presence: false,
          localisation: '',
          etat: 'Bon',
          mesures: '',
        },
      },
      composes_suspectes: [
        { nom_compose: '', concentration_estimee: '', localisation: '', risque_sante: 'Faible', mesures_protection: '' },
      ],
      ouvrages_enterres: {
        reseaux_identifies: [
          { type_reseau: '', localisation: '', profondeur: '', etat: 'Bon', precautions: '' },
        ],
        actions_prealables: [
          { action: '', responsable: '', echeance: '', statut: 'À faire' },
        ],
      },
      validation: {
        valide_par: '',
        date_validation: '',
        observations: '',
        prochaine_revision: '',
      },
    },
  });

  const { fields: risquesTerrainFields, append: appendRisqueTerrain, remove: removeRisqueTerrain } = useFieldArray({
    control,
    name: 'risques_terrain'
  });

  const { fields: composesFields, append: appendCompose, remove: removeCompose } = useFieldArray({
    control,
    name: 'composes_suspectes'
  });

  const { fields: reseauxFields, append: appendReseau, remove: removeReseau } = useFieldArray({
    control,
    name: 'ouvrages_enterres.reseaux_identifies'
  });

  const { fields: actionsFields, append: appendAction, remove: removeAction } = useFieldArray({
    control,
    name: 'ouvrages_enterres.actions_prealables'
  });

  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as RiskAnalysis);
          }
        } catch (err: any) {
          setError("Impossible de charger les données de l'analyse de risques.");
          console.error('Erreur lors du chargement:', err);
        } finally {
          setLoading(false);
        }
      };

      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData]);

  const onSubmit: SubmitHandler<RiskAnalysis> = async (formValues) => {
    setLoading(true);
    setError('');

    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'risk_analysis',
        siteId: siteId ?? null,
        createdBy: user?.id ?? null,
        isEdit: isEditMode,
        specificData: formValues,
      });

      if (result.status === 'pending') {
        showToast(
          'warning',
          "Synchronisation en attente — la fiche sera envoyée dès le retour du réseau.",
          0,
          'sync-queue-banner',
        );
      }

      navigate(`/sites/${siteId}/surveys`);
    } catch (err: any) {
      setError("Impossible de sauvegarder l'analyse de risques.");
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <FormPageLayout title="Analyse de Risques">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title="Analyse de Risques">
      <DevelopmentBanner className="mb-6" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Page 1 - Prestations */}
        <FormSection title="Prestations">
          <div className="grid grid-cols-2 gap-4">
            <CheckboxField
              name="prestations.visite_site"
              label="Visite de site"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.sondages_sol"
              label="Sondages de sol"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.prelevements_sol"
              label="Prélèvements de sol"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.prelevements_eau"
              label="Prélèvements d'eau"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.prelevements_air"
              label="Prélèvements d'air"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.analyses_laboratoire"
              label="Analyses de laboratoire"
              register={register}
              errors={errors}
            />
            <CheckboxField
              name="prestations.etude_documentaire"
              label="Étude documentaire"
              register={register}
              errors={errors}
            />
            <InputField
              name="prestations.autres"
              label="Autres"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Page 1 - Transport */}
        <FormSection title="Transport">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              name="transport.distance_km"
              label="Distance (km)"
              type="number"
              register={register}
              errors={errors}
            />
            <InputField
              name="transport.duree_estimee_heures"
              label="Durée estimée (heures)"
              type="number"
              register={register}
              errors={errors}
            />
            <SelectField
              name="transport.moyen_transport"
              label="Moyen de transport"
              register={register}
              errors={errors}
              options={[
                { value: 'Véhicule léger', label: 'Véhicule léger' },
                { value: 'Véhicule utilitaire', label: 'Véhicule utilitaire' },
                { value: 'Camion', label: 'Camion' },
                { value: 'Autre', label: 'Autre' },
              ]}
            />
            <InputField
              name="transport.conducteur"
              label="Conducteur"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Page 2 - Risques terrain */}
        <FormSection title="Risques Terrain">
          {risquesTerrainFields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Risque {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeRisqueTerrain(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name={`risques_terrain.${index}.type_risque`}
                  label="Type de risque"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name={`risques_terrain.${index}.description`}
                  label="Description"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name={`risques_terrain.${index}.probabilite`}
                  label="Probabilité"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Faible', label: 'Faible' },
                    { value: 'Modérée', label: 'Modérée' },
                    { value: 'Élevée', label: 'Élevée' },
                  ]}
                />
                <SelectField
                  name={`risques_terrain.${index}.gravite`}
                  label="Gravité"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Faible', label: 'Faible' },
                    { value: 'Modérée', label: 'Modérée' },
                    { value: 'Élevée', label: 'Élevée' },
                  ]}
                />
                <TextareaField
                  name={`risques_terrain.${index}.mesures_prevention`}
                  label="Mesures de prévention"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name={`risques_terrain.${index}.responsable`}
                  label="Responsable"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendRisqueTerrain({ type_risque: '', description: '', probabilite: 'Faible', gravite: 'Faible', mesures_prevention: '', responsable: '' })}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un risque
          </button>
        </FormSection>

        {/* Page 2 - Revêtements */}
        <FormSection title="Revêtements">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Amiante</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="revetements.amiante.presence"
                  label="Présence d'amiante"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name="revetements.amiante.localisation"
                  label="Localisation"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name="revetements.amiante.etat"
                  label="État"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Bon', label: 'Bon' },
                    { value: 'Dégradé', label: 'Dégradé' },
                    { value: 'Très dégradé', label: 'Très dégradé' },
                  ]}
                />
                <TextareaField
                  name="revetements.amiante.mesures"
                  label="Mesures"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">HAP</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="revetements.hap.presence"
                  label="Présence de HAP"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name="revetements.hap.localisation"
                  label="Localisation"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name="revetements.hap.etat"
                  label="État"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Bon', label: 'Bon' },
                    { value: 'Dégradé', label: 'Dégradé' },
                    { value: 'Très dégradé', label: 'Très dégradé' },
                  ]}
                />
                <TextareaField
                  name="revetements.hap.mesures"
                  label="Mesures"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Page 3 - Composés suspectés */}
        <FormSection title="Composés Suspectés">
          {composesFields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Composé {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeCompose(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name={`composes_suspectes.${index}.nom_compose`}
                  label="Nom du composé"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name={`composes_suspectes.${index}.concentration_estimee`}
                  label="Concentration estimée"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name={`composes_suspectes.${index}.localisation`}
                  label="Localisation"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name={`composes_suspectes.${index}.risque_sante`}
                  label="Risque santé"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Faible', label: 'Faible' },
                    { value: 'Modéré', label: 'Modéré' },
                    { value: 'Élevé', label: 'Élevé' },
                  ]}
                />
                <TextareaField
                  name={`composes_suspectes.${index}.mesures_protection`}
                  label="Mesures de protection"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendCompose({ nom_compose: '', concentration_estimee: '', localisation: '', risque_sante: 'Faible', mesures_protection: '' })}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un composé
          </button>
        </FormSection>

        {/* Page 3 - Ouvrages enterrés */}
        <FormSection title="Ouvrages Enterrés">
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Réseaux identifiés</h4>
              {reseauxFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium">Réseau {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeReseau(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      name={`ouvrages_enterres.reseaux_identifies.${index}.type_reseau`}
                      label="Type de réseau"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`ouvrages_enterres.reseaux_identifies.${index}.localisation`}
                      label="Localisation"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`ouvrages_enterres.reseaux_identifies.${index}.profondeur`}
                      label="Profondeur"
                      register={register}
                      errors={errors}
                    />
                    <SelectField
                      name={`ouvrages_enterres.reseaux_identifies.${index}.etat`}
                      label="État"
                      register={register}
                      errors={errors}
                      options={[
                        { value: 'Bon', label: 'Bon' },
                        { value: 'Dégradé', label: 'Dégradé' },
                        { value: 'Inconnu', label: 'Inconnu' },
                      ]}
                    />
                    <TextareaField
                      name={`ouvrages_enterres.reseaux_identifies.${index}.precautions`}
                      label="Précautions"
                      register={register}
                      errors={errors}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendReseau({ type_reseau: '', localisation: '', profondeur: '', etat: 'Bon', precautions: '' })}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un réseau
              </button>
            </div>

            <div>
              <h4 className="font-medium mb-4">Actions préalables</h4>
              {actionsFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium">Action {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      name={`ouvrages_enterres.actions_prealables.${index}.action`}
                      label="Action"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`ouvrages_enterres.actions_prealables.${index}.responsable`}
                      label="Responsable"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`ouvrages_enterres.actions_prealables.${index}.echeance`}
                      label="Échéance"
                      register={register}
                      errors={errors}
                    />
                    <SelectField
                      name={`ouvrages_enterres.actions_prealables.${index}.statut`}
                      label="Statut"
                      register={register}
                      errors={errors}
                      options={[
                        { value: 'À faire', label: 'À faire' },
                        { value: 'En cours', label: 'En cours' },
                        { value: 'Terminé', label: 'Terminé' },
                      ]}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendAction({ action: '', responsable: '', echeance: '', statut: 'À faire' })}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une action
              </button>
            </div>
          </div>
        </FormSection>

        {/* Page 3 - Validation */}
        <FormSection title="Validation">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              name="validation.valide_par"
              label="Validé par"
              register={register}
              errors={errors}
            />
            <InputField
              name="validation.date_validation"
              label="Date de validation"
              type="date"
              register={register}
              errors={errors}
            />
            <TextareaField
              name="validation.observations"
              label="Observations"
              register={register}
              errors={errors}
            />
            <InputField
              name="validation.prochaine_revision"
              label="Prochaine révision"
              type="date"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(`/sites/${siteId}/surveys`)}
            className="px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            Annuler
          </button>
          
          <div className="flex justify-center sm:justify-end">
            <SubmitButton loading={loading} className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3" />
          </div>
        </div>
      </form>
    </FormPageLayout>
  );
}