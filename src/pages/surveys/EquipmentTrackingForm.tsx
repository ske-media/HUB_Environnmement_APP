import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveyDraftId } from '../../hooks/useSurveyDraftId';
import { submitSurveyUpsert } from '../../lib/offline/submitSurveyUpsert';
import { loadSurveySpecificDataWithOfflineFallback } from '../../lib/offline/loadSurveySpecificData';
import { useToast } from '../../contexts/ToastContext';
import { EquipmentTrackingSchema, type EquipmentTracking } from '../../schema/equipmentTrackingSchema';
import { FormPageLayout } from '../../components/forms/FormPageLayout';
import { FormSection } from '../../components/forms/FormSection';
import { InputField } from '../../components/forms/fields/InputField';
import { TextareaField } from '../../components/forms/fields/TextareaField';
import { SelectField } from '../../components/forms/fields/SelectField';
import { SubmitButton } from '../../components/forms/SubmitButton';
import { DevelopmentBanner } from '../../components/DevelopmentBanner';

export function EquipmentTrackingForm() {
  const navigate = useNavigate();
  const { siteId, surveyId } = useParams();
  const { user } = useAuth();
  const isEditMode = Boolean(surveyId);
  const draftId = useSurveyDraftId(surveyId);
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<EquipmentTracking>({
    resolver: zodResolver(EquipmentTrackingSchema),
    defaultValues: {
      nom_mission: '',
      technicien_responsable: '',
      date_depart: '',
      date_retour_prevue: '',
      vehicule_utilise: '',
      appareils_mesure: [],
      materiel_prelevement: [],
      consommables: [],
      rapport_mission: {
        problemes_rencontres: '',
        materiel_perdu_casse: ''
      }
    }
  });

  const { fields: appareilsFields, append: appendAppareil, remove: removeAppareil } = useFieldArray({
    control,
    name: 'appareils_mesure'
  });

  const { fields: materielFields, append: appendMateriel, remove: removeMateriel } = useFieldArray({
    control,
    name: 'materiel_prelevement'
  });

  const { fields: consommablesFields, append: appendConsommable, remove: removeConsommable } = useFieldArray({
    control,
    name: 'consommables'
  });

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (isEditMode && surveyId) {
      const loadSurveyData = async () => {
        setLoading(true);
        try {
          const specificData = await loadSurveySpecificDataWithOfflineFallback(surveyId);
          if (specificData) {
            reset(specificData as EquipmentTracking);
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
  }, [isEditMode, surveyId, reset]);

  const onSubmit: SubmitHandler<EquipmentTracking> = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const result = await submitSurveyUpsert({
        surveyId: draftId,
        surveyType: 'equipment_tracking',
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
      title={`${isEditMode ? 'Modifier' : 'Nouveau'} Suivi Matériel par Chantier`}
      subtitle="Gestion du matériel et équipements"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                name="nom_mission"
                label="Nom de la mission"
                register={register}
                errors={errors}
                placeholder="Ex: Mission Site ABC"
                isRequired={true}
              />
              <InputField
                name="technicien_responsable"
                label="Technicien responsable"
                register={register}
                errors={errors}
                placeholder="Nom du technicien"
                isRequired={true}
              />
              <InputField
                name="date_depart"
                label="Date de départ"
                register={register}
                errors={errors}
                type="date"
                isRequired={true}
              />
              <InputField
                name="date_retour_prevue"
                label="Date de retour prévue"
                register={register}
                errors={errors}
                type="date"
                isRequired={true}
              />
              <div className="md:col-span-2">
                <InputField
                  name="vehicule_utilise"
                  label="Véhicule utilisé"
                  register={register}
                  errors={errors}
                  placeholder="Ex: Véhicule utilitaire ABC-123"
                />
              </div>
            </div>
          </FormSection>

          {/* --- SECTION 2 : APPAREILS DE MESURE --- */}
          <FormSection 
            number={2} 
            title="Appareils de mesure"
            actionButton={
              <button
                type="button"
                onClick={() => appendAppareil({ nom_appareil: '', numero_serie: '', etat_depart: 'OK', etat_retour: 'OK', remarques: '' })}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ajouter un appareil
              </button>
            }
          >
            {appareilsFields.map((field, index) => (
              <div key={field.id} className="bg-surface-200 dark:bg-surface-700 p-6 rounded-xl border border-white/10 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Appareil {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeAppareil(index)}
                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InputField
                    name={`appareils_mesure.${index}.nom_appareil`}
                    label="Nom de l'appareil"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Multimètre"
                    isRequired={true}
                  />
                  <InputField
                    name={`appareils_mesure.${index}.numero_serie`}
                    label="Numéro de série"
                    register={register}
                    errors={errors}
                    placeholder="Ex: MM-2024-001"
                    isRequired={true}
                  />
                  <SelectField
                    name={`appareils_mesure.${index}.etat_depart`}
                    label="État départ"
                    register={register}
                    errors={errors}
                    options={[
                      { value: 'OK', label: 'OK' },
                      { value: 'Défaut', label: 'Défaut' }
                    ]}
                    isRequired={true}
                  />
                  <SelectField
                    name={`appareils_mesure.${index}.etat_retour`}
                    label="État retour"
                    register={register}
                    errors={errors}
                    options={[
                      { value: 'OK', label: 'OK' },
                      { value: 'Défaut', label: 'Défaut' }
                    ]}
                    isRequired={true}
                  />
                  <div className="md:col-span-2">
                    <InputField
                      name={`appareils_mesure.${index}.remarques`}
                      label="Remarques"
                      register={register}
                      errors={errors}
                      placeholder="Observations particulières"
                    />
                  </div>
                </div>
              </div>
            ))}
          </FormSection>

          {/* --- SECTION 3 : MATÉRIEL DE PRÉLÈVEMENT --- */}
          <FormSection 
            number={3} 
            title="Matériel de prélèvement"
            actionButton={
              <button
                type="button"
                onClick={() => appendMateriel({ nom_materiel: '', quantite_depart: 0, quantite_retour: 0 })}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ajouter du matériel
              </button>
            }
          >
            {materielFields.map((field, index) => (
              <div key={field.id} className="bg-surface-200 dark:bg-surface-700 p-6 rounded-xl border border-white/10 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Matériel {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMateriel(index)}
                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    name={`materiel_prelevement.${index}.nom_materiel`}
                    label="Nom du matériel"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Fioles de prélèvement"
                    isRequired={true}
                  />
                  <InputField
                    name={`materiel_prelevement.${index}.quantite_depart`}
                    label="Quantité départ"
                    register={register}
                    errors={errors}
                    type="number"
                    placeholder="0"
                    isRequired={true}
                  />
                  <InputField
                    name={`materiel_prelevement.${index}.quantite_retour`}
                    label="Quantité retour"
                    register={register}
                    errors={errors}
                    type="number"
                    placeholder="0"
                    isRequired={true}
                  />
                </div>
              </div>
            ))}
          </FormSection>

          {/* --- SECTION 4 : CONSOMMABLES --- */}
          <FormSection 
            number={4} 
            title="Consommables"
            actionButton={
              <button
                type="button"
                onClick={() => appendConsommable({ nom_consommable: '', quantite_prise: 0 })}
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Ajouter un consommable
              </button>
            }
          >
            {consommablesFields.map((field, index) => (
              <div key={field.id} className="bg-surface-200 dark:bg-surface-700 p-6 rounded-xl border border-white/10 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">Consommable {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeConsommable(index)}
                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    name={`consommables.${index}.nom_consommable`}
                    label="Nom du consommable"
                    register={register}
                    errors={errors}
                    placeholder="Ex: Gants nitrile"
                    isRequired={true}
                  />
                  <InputField
                    name={`consommables.${index}.quantite_prise`}
                    label="Quantité prise"
                    register={register}
                    errors={errors}
                    type="number"
                    placeholder="0"
                    isRequired={true}
                  />
                </div>
              </div>
            ))}
          </FormSection>

          {/* --- SECTION 5 : RAPPORT DE MISSION --- */}
          <FormSection number={5} title="Rapport de mission">
            <div className="space-y-6">
              <TextareaField
                name="rapport_mission.problemes_rencontres"
                label="Problèmes rencontrés"
                register={register}
                errors={errors}
                rows={4}
                placeholder="Décrivez les problèmes rencontrés pendant la mission..."
              />
              <TextareaField
                name="rapport_mission.materiel_perdu_casse"
                label="Matériel perdu ou cassé"
                register={register}
                errors={errors}
                rows={4}
                placeholder="Listez le matériel perdu ou cassé..."
              />
            </div>
          </FormSection>
          
              <div className="flex justify-center sm:justify-end items-start pt-8">
                <SubmitButton loading={loading} className="w-full sm:w-auto text-base sm:text-sm py-4 sm:py-3" />
          </div>
        </form>
      )}
    </FormPageLayout>
  );
}
