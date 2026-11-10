import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { IcpeVisitQuestionnaireSchema, IcpeVisitQuestionnaire } from '../../schema/icpeVisitQuestionnaireSchema';
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
import { FormSkeleton } from '../../components/forms/FormSkeleton';

export function IcpeVisitQuestionnaireForm() {
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
  } = useForm<IcpeVisitQuestionnaire>({
    resolver: zodResolver(IcpeVisitQuestionnaireSchema),
    defaultValues: {
      identite: {
        nom_exploitant: '',
        numero_dossier_icpe: '',
        date_visite: '',
        inspecteur: '',
        adresse_site: '',
        activite_principale: '',
        effectif: 0,
      },
      rubriques: [
        { numero_rubrique: '', libelle: '', regime: 'Déclaration', statut: 'Conforme', observations: '' },
      ],
      rapports_inspection: {
        dernier_rapport: {
          date: '',
          type: 'Contrôle',
          resultat: 'Conforme',
          observations: '',
        },
        rapports_anterieurs: [
          { date: '', type: '', resultat: '', observations: '' },
        ],
      },
      mise_en_securite: {
        acces: {
          signalisation: false,
          cloture: false,
          portail: false,
          eclairage: false,
          observations: '',
        },
        evacuation_produits: {
          systeme_evacuation: false,
          capacite_suffisante: false,
          maintenance: false,
          observations: '',
        },
        vidange_nettoyage: {
          procedure_etablie: false,
          frequence: '',
          responsable: '',
          observations: '',
        },
        prevention_incendie: {
          extincteurs: false,
          detection: false,
          alarme: false,
          observations: '',
        },
      },
      gestion_environnementale: {
        dechets: {
          tri: false,
          stockage: false,
          registre: false,
          bsd: false,
          observations: '',
        },
        eau: {
          reseau_pluviales: false,
          dispositif_anti_pollution: false,
          rejets_conformes: false,
          observations: '',
        },
        air: {
          mesures_rejets: false,
          installations_captage: false,
          bruit_voisinage: false,
          observations: '',
        },
        produits_chimiques: {
          stockage_retention: false,
          compatibilite: false,
          fds_disponibles: false,
          observations: '',
        },
      },
      synthese: {
        points_conformite: '',
        points_non_conformite: '',
        plan_actions: '',
        prochaine_visite: '',
        signature_inspecteur: '',
        date_signature: '',
      },
    },
  });

  const { fields: rubriquesFields, append: appendRubrique, remove: removeRubrique } = useFieldArray({
    control,
    name: 'rubriques'
  });

  const { fields: rapportsFields, append: appendRapport, remove: removeRapport } = useFieldArray({
    control,
    name: 'rapports_inspection.rapports_anterieurs'
  });

  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as IcpeVisitQuestionnaire);
          }
        } catch (err: any) {
          setError("Impossible de charger les données du questionnaire ICPE.");
          console.error('Erreur lors du chargement:', err);
        } finally {
          setLoading(false);
        }
      };

      loadSurveyData();
    }
  }, [isEditMode, surveyId, reset, siteData]);

  const onSubmit: SubmitHandler<IcpeVisitQuestionnaire> = async (formValues) => {
    setLoading(true);
    setError('');

    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'icpe_visit',
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
      setError("Impossible de sauvegarder le questionnaire ICPE.");
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <FormPageLayout title="Questionnaire de Visite ICPE">
        <FormSkeleton />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title="Questionnaire de Visite ICPE">
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

        {/* Page 1 - Identité */}
        <FormSection title="Identité">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              name="identite.nom_exploitant"
              label="Nom de l'exploitant"
              register={register}
              errors={errors}
              required
            />
            <InputField
              name="identite.numero_dossier_icpe"
              label="Numéro de dossier ICPE"
              register={register}
              errors={errors}
              required
            />
            <InputField
              name="identite.date_visite"
              label="Date de visite"
              type="date"
              register={register}
              errors={errors}
            />
            <InputField
              name="identite.inspecteur"
              label="Inspecteur"
              register={register}
              errors={errors}
            />
            <InputField
              name="identite.adresse_site"
              label="Adresse du site"
              register={register}
              errors={errors}
            />
            <InputField
              name="identite.activite_principale"
              label="Activité principale"
              register={register}
              errors={errors}
            />
            <InputField
              name="identite.effectif"
              label="Effectif"
              type="number"
              register={register}
              errors={errors}
            />
          </div>
        </FormSection>

        {/* Page 2 - Rubriques */}
        <FormSection title="Rubriques Nomenclature ICPE">
          {rubriquesFields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Rubrique {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeRubrique(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name={`rubriques.${index}.numero_rubrique`}
                  label="Numéro de rubrique"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name={`rubriques.${index}.libelle`}
                  label="Libellé"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name={`rubriques.${index}.regime`}
                  label="Régime"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Déclaration', label: 'Déclaration' },
                    { value: 'Enregistrement', label: 'Enregistrement' },
                    { value: 'Autorisation', label: 'Autorisation' },
                  ]}
                />
                <SelectField
                  name={`rubriques.${index}.statut`}
                  label="Statut"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Conforme', label: 'Conforme' },
                    { value: 'Non conforme', label: 'Non conforme' },
                    { value: 'À vérifier', label: 'À vérifier' },
                  ]}
                />
                <TextareaField
                  name={`rubriques.${index}.observations`}
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendRubrique({ numero_rubrique: '', libelle: '', regime: 'Déclaration', statut: 'Conforme', observations: '' })}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une rubrique
          </button>
        </FormSection>

        {/* Page 3 - Rapports d'inspection */}
        <FormSection title="Rapports d'Inspection">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Dernier rapport</h4>
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  name="rapports_inspection.dernier_rapport.date"
                  label="Date"
                  type="date"
                  register={register}
                  errors={errors}
                />
                <SelectField
                  name="rapports_inspection.dernier_rapport.type"
                  label="Type"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Contrôle', label: 'Contrôle' },
                    { value: 'Inspection', label: 'Inspection' },
                    { value: 'Visite', label: 'Visite' },
                  ]}
                />
                <SelectField
                  name="rapports_inspection.dernier_rapport.resultat"
                  label="Résultat"
                  register={register}
                  errors={errors}
                  options={[
                    { value: 'Conforme', label: 'Conforme' },
                    { value: 'Non conforme', label: 'Non conforme' },
                    { value: 'Mise en demeure', label: 'Mise en demeure' },
                  ]}
                />
                <TextareaField
                  name="rapports_inspection.dernier_rapport.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Rapports antérieurs</h4>
              {rapportsFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <h5 className="font-medium">Rapport {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeRapport(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      name={`rapports_inspection.rapports_anterieurs.${index}.date`}
                      label="Date"
                      type="date"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`rapports_inspection.rapports_anterieurs.${index}.type`}
                      label="Type"
                      register={register}
                      errors={errors}
                    />
                    <InputField
                      name={`rapports_inspection.rapports_anterieurs.${index}.resultat`}
                      label="Résultat"
                      register={register}
                      errors={errors}
                    />
                    <TextareaField
                      name={`rapports_inspection.rapports_anterieurs.${index}.observations`}
                      label="Observations"
                      register={register}
                      errors={errors}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendRapport({ date: '', type: '', resultat: '', observations: '' })}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un rapport
              </button>
            </div>
          </div>
        </FormSection>

        {/* Page 4 - Mise en sécurité */}
        <FormSection title="Mise en Sécurité">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Accès</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="mise_en_securite.acces.signalisation"
                  label="Signalisation"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.acces.cloture"
                  label="Clôture"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.acces.portail"
                  label="Portail"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.acces.eclairage"
                  label="Éclairage"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="mise_en_securite.acces.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Évacuation des produits</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="mise_en_securite.evacuation_produits.systeme_evacuation"
                  label="Système d'évacuation"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.evacuation_produits.capacite_suffisante"
                  label="Capacité suffisante"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.evacuation_produits.maintenance"
                  label="Maintenance"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="mise_en_securite.evacuation_produits.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Vidange et nettoyage</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="mise_en_securite.vidange_nettoyage.procedure_etablie"
                  label="Procédure établie"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name="mise_en_securite.vidange_nettoyage.frequence"
                  label="Fréquence"
                  register={register}
                  errors={errors}
                />
                <InputField
                  name="mise_en_securite.vidange_nettoyage.responsable"
                  label="Responsable"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="mise_en_securite.vidange_nettoyage.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Prévention incendie</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="mise_en_securite.prevention_incendie.extincteurs"
                  label="Extincteurs"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.prevention_incendie.detection"
                  label="Détection"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="mise_en_securite.prevention_incendie.alarme"
                  label="Alarme"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="mise_en_securite.prevention_incendie.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Page 5 - Gestion environnementale */}
        <FormSection title="Gestion Environnementale">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Déchets</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="gestion_environnementale.dechets.tri"
                  label="Tri"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.dechets.stockage"
                  label="Stockage"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.dechets.registre"
                  label="Registre"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.dechets.bsd"
                  label="BSD"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="gestion_environnementale.dechets.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Eau</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="gestion_environnementale.eau.reseau_pluviales"
                  label="Réseau eaux pluviales"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.eau.dispositif_anti_pollution"
                  label="Dispositif anti-pollution"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.eau.rejets_conformes"
                  label="Rejets conformes"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="gestion_environnementale.eau.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Air</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="gestion_environnementale.air.mesures_rejets"
                  label="Mesures rejets air"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.air.installations_captage"
                  label="Installations captage"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.air.bruit_voisinage"
                  label="Bruit voisinage"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="gestion_environnementale.air.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Produits chimiques</h4>
              <div className="grid grid-cols-2 gap-4">
                <CheckboxField
                  name="gestion_environnementale.produits_chimiques.stockage_retention"
                  label="Stockage sur rétention"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.produits_chimiques.compatibilite"
                  label="Compatibilité"
                  register={register}
                  errors={errors}
                />
                <CheckboxField
                  name="gestion_environnementale.produits_chimiques.fds_disponibles"
                  label="FDS disponibles"
                  register={register}
                  errors={errors}
                />
                <TextareaField
                  name="gestion_environnementale.produits_chimiques.observations"
                  label="Observations"
                  register={register}
                  errors={errors}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Page 5 - Synthèse */}
        <FormSection title="Synthèse">
          <div className="grid grid-cols-2 gap-4">
            <TextareaField
              name="synthese.points_conformite"
              label="Points de conformité"
              register={register}
              errors={errors}
            />
            <TextareaField
              name="synthese.points_non_conformite"
              label="Points de non-conformité"
              register={register}
              errors={errors}
            />
            <TextareaField
              name="synthese.plan_actions"
              label="Plan d'actions"
              register={register}
              errors={errors}
            />
            <InputField
              name="synthese.prochaine_visite"
              label="Prochaine visite"
              type="date"
              register={register}
              errors={errors}
            />
            <InputField
              name="synthese.signature_inspecteur"
              label="Signature inspecteur"
              register={register}
              errors={errors}
            />
            <InputField
              name="synthese.date_signature"
              label="Date de signature"
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