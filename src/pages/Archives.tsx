import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Briefcase, AlertCircle, ArrowLeft, Trash2, RotateCcw, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ENABLED_SURVEY_TYPES } from '../lib/surveyTypes';
import type { Site, Survey } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { deleteSiteStorage } from '../hooks/useSites';

type TabType = 'sites' | 'surveys';

const getSurveyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'soil': 'Sondage Sol',
    'groundwater': 'Sondage Eau Souterraine',
    'gas': 'Sondage Gaz',
    'ambient_air': 'Sondage Air Ambiant',
    'surface_water': 'Sondage Eau de Surface',
    'pid': 'Sondage PID',
    'piezometric': 'Fiche Piézométrique',
    'tap_water': 'Eaux du Robinet',
    'sediment': 'Sédiments',
    'excavation': 'Suivi de Fouille',
    'risk_analysis': 'Analyse des Risques',
    'radon_soil': 'Radon Sol',
    'site_visit': 'Questionnaire Visite de Site',
    'equipment_tracking': 'Suivi Matériel',
    'garden_questionnaire': 'Questionnaire Jardin',
    'icpe_visit': 'Visite ICPE'
  };
  return labels[type] || type;
};

export function Archives() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('sites');
  const [sites, setSites] = useState<Site[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringSite, setRestoringSite] = useState<string | null>(null);
  const [restoringSurvey, setRestoringSurvey] = useState<string | null>(null);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<string | null>(null);
  const [deleteSiteDialog, setDeleteSiteDialog] = useState<{ isOpen: boolean; siteId: string | null }>({ isOpen: false, siteId: null });
  const [deleteSurveyDialog, setDeleteSurveyDialog] = useState<{ isOpen: boolean; surveyId: string | null }>({ isOpen: false, surveyId: null });

  useEffect(() => {
    if (activeTab === 'sites') {
      loadDeletedSites();
    } else {
      loadDeletedSurveys();
    }
  }, [activeTab]);

  const loadDeletedSites = async () => {
    setLoading(true);
    try {
      // Utiliser RPC ou une requête directe pour contourner RLS
      // Note: Les politiques RLS filtrent déjà deleted_at IS NULL, donc on doit utiliser une fonction ou bypasser
      // Pour l'instant, on va utiliser une requête directe qui devrait fonctionner si l'utilisateur a les droits
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error('Error loading deleted sites:', err);
      setError('Une erreur est survenue lors du chargement des sites supprimés');
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedSurveys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (err) {
      console.error('Error loading deleted surveys:', err);
      setError('Une erreur est survenue lors du chargement des fiches supprimées');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSite = async (siteId: string) => {
    try {
      setRestoringSite(siteId);
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: null })
        .eq('id', siteId);

      if (error) throw error;

      setSites(sites.filter(site => site.id !== siteId));
      showToast('success', 'Le site a été restauré avec succès');
    } catch (err: any) {
      console.error('Error restoring site:', err);
      showToast('error', 'Impossible de restaurer le site');
    } finally {
      setRestoringSite(null);
    }
  };

  const handleRestoreSurvey = async (surveyId: string) => {
    try {
      setRestoringSurvey(surveyId);
      const { error } = await supabase
        .from('surveys')
        .update({ deleted_at: null })
        .eq('id', surveyId);

      if (error) throw error;

      setSurveys(surveys.filter(survey => survey.id !== surveyId));
      showToast('success', 'La fiche a été restaurée avec succès');
    } catch (err: any) {
      console.error('Error restoring survey:', err);
      showToast('error', 'Impossible de restaurer la fiche');
    } finally {
      setRestoringSurvey(null);
    }
  };

  const handlePermanentDeleteSite = async (siteId: string) => {
    try {
      setDeletingSite(siteId);
      await deleteSiteStorage(siteId);
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      setSites(sites.filter(site => site.id !== siteId));
      showToast('success', 'Le site a été supprimé définitivement');
    } catch (err: any) {
      console.error('Error permanently deleting site:', err);
      showToast('error', 'Impossible de supprimer définitivement le site');
    } finally {
      setDeletingSite(null);
      setDeleteSiteDialog({ isOpen: false, siteId: null });
    }
  };

  const handlePermanentDeleteSurvey = async (surveyId: string) => {
    try {
      setDeletingSurvey(surveyId);
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId);

      if (error) throw error;

      setSurveys(surveys.filter(survey => survey.id !== surveyId));
      showToast('success', 'La fiche a été supprimée définitivement');
    } catch (err: any) {
      console.error('Error permanently deleting survey:', err);
      showToast('error', 'Impossible de supprimer définitivement la fiche');
    } finally {
      setDeletingSurvey(null);
      setDeleteSurveyDialog({ isOpen: false, surveyId: null });
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link
          to="/"
          className="mr-4 p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Retour à la liste des sites"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Corbeille</h1>
      </div>

      {/* Onglets */}
      <div className="mb-6 border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sites')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sites'
                ? 'border-[#34519e] text-[#34519e]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20'
            }`}
          >
            Sites supprimés ({sites.length})
          </button>
          <button
            onClick={() => setActiveTab('surveys')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'surveys'
                ? 'border-[#34519e] text-[#34519e]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20'
            }`}
          >
            Fiches supprimées ({surveys.length})
          </button>
        </nav>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#34519e] border-r-transparent"></div>
        </div>
      ) : activeTab === 'sites' ? (
        sites.length === 0 ? (
          <div className="glass-panel overflow-hidden sm:rounded-lg">
            <div className="px-4 py-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Aucun site supprimé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les sites supprimés apparaîtront ici.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-white/10">
              {sites.map((site) => (
                <li key={site.id} className="relative hover:bg-white/5 dark:hover:bg-surface-300/10">
                  <div className="block px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-[#34519e] truncate">
                          {site.name}
                        </p>
                        <p className="ml-2 text-sm text-muted-foreground">
                          #{site.project_number}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Supprimé le {format(new Date(site.deleted_at!), 'PPP', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-muted-foreground" />
                          {site.city}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-muted-foreground sm:mt-0 sm:ml-6">
                          <Briefcase className="flex-shrink-0 mr-1.5 h-5 w-5 text-muted-foreground" />
                          {site.engineer_in_charge || 'Non assigné'}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-muted-foreground sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-muted-foreground" />
                        <p>
                          Créé le{' '}
                          {format(new Date(site.created_at), 'PPP', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleRestoreSite(site.id)}
                        disabled={restoringSite === site.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        <RotateCcw className={`h-4 w-4 mr-2 ${restoringSite === site.id ? 'animate-spin' : ''}`} />
                        {restoringSite === site.id ? 'Restauration...' : 'Restaurer'}
                      </button>
                      {user?.id === site.user_id && (
                        <button
                          onClick={() => setDeleteSiteDialog({ isOpen: true, siteId: site.id })}
                          disabled={deletingSite === site.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <Trash2 className={`h-4 w-4 mr-2 ${deletingSite === site.id ? 'animate-pulse' : ''}`} />
                          {deletingSite === site.id ? 'Suppression...' : 'Supprimer définitivement'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : (
        surveys.length === 0 ? (
          <div className="glass-panel overflow-hidden sm:rounded-lg">
            <div className="px-4 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Aucune fiche supprimée</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les fiches supprimées apparaîtront ici.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-white/10">
              {surveys
                .filter(survey => ENABLED_SURVEY_TYPES.includes(survey.type as any))
                .map((survey) => (
                <li key={survey.id} className="relative hover:bg-white/5 dark:hover:bg-surface-300/10">
                  <div className="block px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-[#34519e] rounded-full flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-foreground">
                            {getSurveyTypeLabel(survey.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(survey.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-2">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Supprimé le {format(new Date(survey.deleted_at!), 'PPP', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleRestoreSurvey(survey.id)}
                        disabled={restoringSurvey === survey.id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        <RotateCcw className={`h-4 w-4 mr-2 ${restoringSurvey === survey.id ? 'animate-spin' : ''}`} />
                        {restoringSurvey === survey.id ? 'Restauration...' : 'Restaurer'}
                      </button>
                      {user?.id === survey.created_by && (
                        <button
                          onClick={() => setDeleteSurveyDialog({ isOpen: true, surveyId: survey.id })}
                          disabled={deletingSurvey === survey.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          <Trash2 className={`h-4 w-4 mr-2 ${deletingSurvey === survey.id ? 'animate-pulse' : ''}`} />
                          {deletingSurvey === survey.id ? 'Suppression...' : 'Supprimer définitivement'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {/* Modale de confirmation pour la suppression définitive d'un site */}
      <ConfirmDialog
        isOpen={deleteSiteDialog.isOpen}
        title="Supprimer définitivement le site"
        message="Êtes-vous sûr de vouloir supprimer définitivement ce site ? Cette action est irréversible et supprimera également toutes les fiches associées."
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => deleteSiteDialog.siteId && handlePermanentDeleteSite(deleteSiteDialog.siteId)}
        onCancel={() => setDeleteSiteDialog({ isOpen: false, siteId: null })}
      />

      {/* Modale de confirmation pour la suppression définitive d'une fiche */}
      <ConfirmDialog
        isOpen={deleteSurveyDialog.isOpen}
        title="Supprimer définitivement la fiche"
        message="Êtes-vous sûr de vouloir supprimer définitivement cette fiche ? Cette action est irréversible."
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => deleteSurveyDialog.surveyId && handlePermanentDeleteSurvey(deleteSurveyDialog.surveyId)}
        onCancel={() => setDeleteSurveyDialog({ isOpen: false, surveyId: null })}
      />
    </div>
  );
}
