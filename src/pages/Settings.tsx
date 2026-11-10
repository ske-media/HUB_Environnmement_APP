import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Shield, 
  Moon, 
  Sun, 
  Download, 
  Trash2, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  FileText,
  MapPin,
  Calendar,
  Briefcase,
  Wrench
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { ENABLED_SURVEY_TYPES } from '../lib/surveyTypes';
import type { Site, Survey } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { deleteSiteStorage } from '../hooks/useSites';
import { repairLocalSurveyPhotos } from '../lib/offline/repairSurveyPhotos';
import { supportsIndexedDb } from '../lib/offline/indexedDbPhotos';

interface Device {
  id: string;
  device: string;
  lastActive: string;
  location: string;
}

interface PasswordStrength {
  score: number;
  feedback: string;
}

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { canAccessAdmin } = usePermission();
  const { theme, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'account');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoutAllDialog, setLogoutAllDialog] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);
  
  // États pour la corbeille
  const { showToast } = useToast();
  const [trashTab, setTrashTab] = useState<'sites' | 'surveys'>('sites');
  const [deletedSites, setDeletedSites] = useState<Site[]>([]);
  const [deletedSurveys, setDeletedSurveys] = useState<Survey[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringSite, setRestoringSite] = useState<string | null>(null);
  const [restoringSurvey, setRestoringSurvey] = useState<string | null>(null);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);
  const [deletingSurvey, setDeletingSurvey] = useState<string | null>(null);
  const [deleteSiteDialog, setDeleteSiteDialog] = useState<{ isOpen: boolean; siteId: string | null }>({ isOpen: false, siteId: null });
  const [deleteSurveyDialog, setDeleteSurveyDialog] = useState<{ isOpen: boolean; surveyId: string | null }>({ isOpen: false, surveyId: null });
  const [photoRepairLoading, setPhotoRepairLoading] = useState(false);
  
  const [devices] = useState<Device[]>([
    { 
      id: '1', 
      device: 'Chrome - Windows', 
      lastActive: new Date().toISOString(),
      location: 'Paris, France'
    }
  ]);

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    firstName: user?.first_name || user?.full_name?.split(' ')[0] || '',
    lastName:
      user?.last_name ||
      (user?.full_name ? user.full_name.split(' ').slice(1).join(' ') : '') ||
      '',
    email: user?.email || ''
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: ''
  });



  const checkPasswordStrength = (password: string) => {
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    switch (score) {
      case 0:
      case 1:
        feedback = 'Très faible';
        break;
      case 2:
        feedback = 'Faible';
        break;
      case 3:
        feedback = 'Moyen';
        break;
      case 4:
        feedback = 'Fort';
        break;
      case 5:
        feedback = 'Très fort';
        break;
    }

    setPasswordStrength({ score, feedback });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: passwords.new 
      });

      if (error) throw error;

      setSuccessMessage('Mot de passe mis à jour avec succès');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setError('Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLast = personalInfo.lastName.trim();
    if (!trimmedLast) {
      setError('Le nom de famille est obligatoire.');
      return;
    }
    setLoading(true);
    try {
      const trimmedFirst = personalInfo.firstName.trim();
      const { error } = await supabase.auth.updateUser({
        email: personalInfo.email,
        data: {
          full_name: `${trimmedFirst} ${trimmedLast}`.trim(),
          first_name: trimmedFirst,
          last_name: trimmedLast,
        }
      });

      if (error) throw error;

      setSuccessMessage('Informations personnelles mises à jour avec succès');
    } catch (err) {
      setError('Erreur lors de la mise à jour des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setSuccessMessage('Tous les appareils ont été déconnectés');
    } catch (err) {
      setError('Erreur lors de la déconnexion des appareils');
    } finally {
      setLoading(false);
      setLogoutAllDialog(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', user?.id);

      if (sitesError) throw sitesError;

      const { data: surveys, error: surveysError } = await supabase
        .from('surveys')
        .select('*')
        .eq('created_by', user?.id);

      if (surveysError) throw surveysError;

      const exportData = {
        user: {
          email: user?.email,
          full_name: user?.full_name
        },
        sites,
        surveys
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hub-environnement-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage('Données exportées avec succès');
    } catch (err) {
      setError('Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Seule la demande est enregistrée (métadonnées du compte, délai de 30 jours).
      // La suppression effective n'est pas automatisée : voir docs/SECURITE.md.
      const { error } = await supabase.auth.updateUser({
        data: { 
          deletion_requested: new Date().toISOString(),
          deletion_effective: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      if (error) throw error;

      await signOut();
      setSuccessMessage('Demande de suppression de compte envoyée');
    } catch (err) {
      setError('Erreur lors de la demande de suppression du compte');
    } finally {
      setLoading(false);
      setDeleteAccountDialog(false);
    }
  };

  // Synchroniser l'onglet actif avec le paramètre d'URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      // Valider que l'onglet est valide
      const validTabs = ['account', 'security', 'trash', 'administration'];
      if (validTabs.includes(tabParam) && tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
    } else if (activeTab !== 'account') {
      // Si pas de paramètre, revenir à 'account' par défaut
      setActiveTab('account');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonctions pour la corbeille
  useEffect(() => {
    if (activeTab === 'trash') {
      if (trashTab === 'sites') {
        loadDeletedSites();
      } else {
        loadDeletedSurveys();
      }
    }
  }, [activeTab, trashTab]);

  const loadDeletedSites = async () => {
    setTrashLoading(true);
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedSites(data || []);
    } catch (err) {
      console.error('Error loading deleted sites:', err);
      showToast('error', 'Une erreur est survenue lors du chargement des sites supprimés');
    } finally {
      setTrashLoading(false);
    }
  };

  const loadDeletedSurveys = async () => {
    setTrashLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedSurveys(data || []);
    } catch (err) {
      console.error('Error loading deleted surveys:', err);
      showToast('error', 'Une erreur est survenue lors du chargement des fiches supprimées');
    } finally {
      setTrashLoading(false);
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

      setDeletedSites(deletedSites.filter(site => site.id !== siteId));
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

      setDeletedSurveys(deletedSurveys.filter(survey => survey.id !== surveyId));
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

      setDeletedSites(deletedSites.filter(site => site.id !== siteId));
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

      setDeletedSurveys(deletedSurveys.filter(survey => survey.id !== surveyId));
      showToast('success', 'La fiche a été supprimée définitivement');
    } catch (err: any) {
      console.error('Error permanently deleting survey:', err);
      showToast('error', 'Impossible de supprimer définitivement la fiche');
    } finally {
      setDeletingSurvey(null);
      setDeleteSurveyDialog({ isOpen: false, surveyId: null });
    }
  };

  const handleRepairLocalPhotos = async () => {
    if (!supportsIndexedDb()) {
      showToast('error', 'IndexedDB indisponible sur cet appareil — réparation impossible.');
      return;
    }

    setPhotoRepairLoading(true);
    try {
      const result = await repairLocalSurveyPhotos();

      if (result.errors.length > 0) {
        console.warn('[Settings] erreurs réparation photos', result.errors);
      }

      if (result.repaired > 0) {
        showToast(
          'success',
          `${result.repaired} photo${result.repaired > 1 ? 's' : ''} réparée${result.repaired > 1 ? 's' : ''} et synchronisée${result.repaired > 1 ? 's' : ''} sur le serveur.`
        );
      } else if (result.cleaned > 0) {
        showToast(
          'warning',
          `${result.cleaned} lien${result.cleaned > 1 ? 's' : ''} photo invalide${result.cleaned > 1 ? 's' : ''} supprimé${result.cleaned > 1 ? 's' : ''} en base.`
        );
      } else {
        showToast(
          'info',
          `Analyse terminée (${result.scannedKeys} entrée${result.scannedKeys > 1 ? 's' : ''} locale${result.scannedKeys > 1 ? 's' : ''}) — aucune photo à réparer sur cet appareil.`
        );
      }
    } catch (err) {
      console.error('Error repairing local photos:', err);
      showToast('error', 'Erreur lors de la réparation des photos locales.');
    } finally {
      setPhotoRepairLoading(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-wide">Paramètres</h1>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 backdrop-blur-sm flex items-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          <p className="text-sm text-green-300">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'account', label: 'Compte', icon: User },
            { id: 'security', label: 'Sécurité', icon: Shield },
            { id: 'trash', label: 'Corbeille', icon: Trash2 },
            ...(canAccessAdmin() ? [{ id: 'administration', label: 'Administration', icon: ShieldCheck }] : [])
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                const newSearchParams = new URLSearchParams(searchParams);
                if (id === 'account') {
                  newSearchParams.delete('tab');
                } else {
                  newSearchParams.set('tab', id);
                }
                setSearchParams(newSearchParams, { replace: true });
              }}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${activeTab === id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20'
                }
              `}
            >
              <Icon className="h-5 w-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Compte */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Informations personnelles */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Informations personnelles</h2>
              <form onSubmit={handlePersonalInfoUpdate} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                      Nom <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      required
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>

            {/* Modification du mot de passe */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Modification du mot de passe</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-300 mb-2">
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      minLength={8}
                      required
                      className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                    />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwords.new}
                    onChange={(e) => {
                      setPasswords(prev => ({ ...prev, new: e.target.value }));
                      checkPasswordStrength(e.target.value);
                    }}
                    minLength={8}
                    required
                    className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                  />
                  {passwords.new && (
                    <div className="mt-1">
                      <div className="flex items-center">
                        <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full">
                          <div
                            className={`h-2 rounded-full ${
                              passwordStrength.score <= 2
                                ? 'bg-red-500'
                                : passwordStrength.score <= 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {passwordStrength.feedback}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                    minLength={8}
                    required
                    className="mt-1 block w-full rounded-xl bg-white/90 dark:bg-surface-200 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm px-4 py-3 transition-all duration-200 backdrop-blur-sm"
                  />
                  {passwords.new && passwords.confirm && (
                    <p className={`mt-1 text-sm ${passwords.new === passwords.confirm ? 'text-green-600' : 'text-red-600'}`}>
                      {passwords.new === passwords.confirm ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || passwords.new !== passwords.confirm}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
                  >
                    Modifier le mot de passe
                  </button>
                </div>
              </form>
            </div>

            {/* Thème */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Thème</h2>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-muted-foreground mr-2" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground mr-2" />
                  )}
                  <span className="text-sm text-white">
                    {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
                  </span>
                </span>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#34519e] focus:ring-offset-2"
                  style={{ backgroundColor: theme === 'dark' ? '#34519e' : '#d1d5db' }}
                >
                  <span
                    className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out"
                    style={{ transform: `translateX(${theme === 'dark' ? '1.25rem' : '0'})` }}
                  />
                </button>
              </div>
            </div>

            {/* Maintenance & Sauvetage */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Maintenance &amp; Sauvetage</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Récupère les photos de terrain encore présentes localement (IndexedDB) et remplace
                les liens <code className="text-xs">blob:</code> expirés en base de données.
                Utile pour les anciennes fiches Gaz du sol dont la photo n&apos;a pas été synchronisée.
              </p>
              <button
                type="button"
                onClick={handleRepairLocalPhotos}
                disabled={photoRepairLoading || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
              >
                <Wrench className={`h-4 w-4 mr-2 ${photoRepairLoading ? 'animate-spin' : ''}`} />
                {photoRepairLoading ? 'Analyse en cours…' : 'Analyser et réparer les photos locales'}
              </button>
            </div>

            {/* Export des données */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Export des données</h2>
              <button
                onClick={handleExportData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter mes données
              </button>
            </div>

            {/* Déconnexion */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Déconnexion</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Fermez votre session sur cet appareil.
              </p>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </button>
            </div>

            {/* Suppression du compte */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow sm:rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Suppression du compte</h2>
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Attention : cette action est irréversible
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Toutes vos données seront supprimées</li>
                        <li>Vous aurez 30 jours pour annuler cette action</li>
                        <li>Après 30 jours, la suppression sera définitive</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteAccountDialog(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </button>
            </div>
          </div>
        )}

        {/* Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Appareils connectés */}
            <div className="glass-panel p-6 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-foreground">Appareils connectés</h2>
                <button
                  onClick={() => setLogoutAllDialog(true)}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-[#34519e] bg-[#34519e]/10 hover:bg-[#34519e]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#34519e] disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnecter tous les appareils
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-surface-200 dark:bg-surface-700">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Appareil</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Dernière activité</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Localisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-card">
                    {devices.map((device) => (
                      <tr key={device.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                          {device.device}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                          {new Date(device.lastActive).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                          {device.location}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Corbeille */}
        {activeTab === 'trash' && (
          <div className="space-y-8">
            {/* Onglets internes */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setTrashTab('sites')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    trashTab === 'sites'
                      ? 'border-[#34519e] text-[#34519e]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20'
                  }`}
                >
                  Sites supprimés ({deletedSites.length})
                </button>
                <button
                  onClick={() => setTrashTab('surveys')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    trashTab === 'surveys'
                      ? 'border-[#34519e] text-[#34519e]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-white/20'
                  }`}
                >
                  Fiches supprimées ({deletedSurveys.length})
                </button>
              </nav>
            </div>

            {trashLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#34519e] border-r-transparent"></div>
              </div>
            ) : trashTab === 'sites' ? (
              deletedSites.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-12 text-center">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">Aucun site supprimé</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Les sites supprimés apparaîtront ici.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow overflow-hidden sm:rounded-lg">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {deletedSites.map((site) => (
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
                              <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
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
              deletedSurveys.length === 0 ? (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">Aucune fiche supprimée</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Les fiches supprimées apparaîtront ici.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 shadow overflow-hidden sm:rounded-lg">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {deletedSurveys
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
                              <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
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
          </div>
        )}

        {/* Administration - Visible uniquement pour super_admin */}
        {activeTab === 'administration' && canAccessAdmin() && (
          <div className="space-y-8">
            <div className="glass-panel-lg p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Administration du système
                </h2>
              </div>
              
              <div className="space-y-6">
                {/* Message d'accès */}
                <div className="glass-panel p-4 border-primary/20">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">
                        Accès administrateur
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        En tant que super administrateur, vous avez un accès complet à toutes les fonctionnalités de l'application.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liste des utilisateurs (Placeholder) */}
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Liste des utilisateurs
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center py-12">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        La gestion des utilisateurs sera disponible prochainement.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Vous pourrez consulter la liste des utilisateurs, modifier leurs rôles et gérer leurs accès.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistiques globales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-panel p-4">
                    <p className="text-sm text-muted-foreground">Total des sites</p>
                    <p className="text-2xl font-bold text-foreground mt-1">-</p>
                    <p className="text-xs text-muted-foreground mt-1">À implémenter</p>
                  </div>
                  <div className="glass-panel p-4">
                    <p className="text-sm text-muted-foreground">Total des fiches</p>
                    <p className="text-2xl font-bold text-foreground mt-1">-</p>
                    <p className="text-xs text-muted-foreground mt-1">À implémenter</p>
                  </div>
                  <div className="glass-panel p-4">
                    <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
                    <p className="text-2xl font-bold text-foreground mt-1">-</p>
                    <p className="text-xs text-muted-foreground mt-1">À implémenter</p>
                  </div>
                </div>

                {/* Actions d'administration */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-md font-semibold text-foreground mb-4">
                    Actions d'administration
                  </h3>
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full text-left px-4 py-3 glass-panel rounded-xl text-sm text-muted-foreground cursor-not-allowed opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4 inline mr-2" />
                      Gérer les utilisateurs (À venir)
                    </button>
                    <button
                      disabled
                      className="w-full text-left px-4 py-3 glass-panel rounded-xl text-sm text-muted-foreground cursor-not-allowed opacity-50"
                    >
                      <FileText className="h-4 w-4 inline mr-2" />
                      Consulter les logs système (À venir)
                    </button>
                    <button
                      disabled
                      className="w-full text-left px-4 py-3 glass-panel rounded-xl text-sm text-muted-foreground cursor-not-allowed opacity-50"
                    >
                      <Download className="h-4 w-4 inline mr-2" />
                      Exporter toutes les données (À venir)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation pour déconnecter tous les appareils */}
      <ConfirmDialog
        isOpen={logoutAllDialog}
        title="Déconnecter tous les appareils"
        message="Êtes-vous sûr de vouloir déconnecter tous les appareils ?"
        confirmText="Déconnecter"
        cancelText="Annuler"
        variant="warning"
        onConfirm={handleLogoutAllDevices}
        onCancel={() => setLogoutAllDialog(false)}
      />

      {/* Modale de confirmation pour supprimer le compte */}
      <ConfirmDialog
        isOpen={deleteAccountDialog}
        title="Supprimer mon compte"
        message="Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible après 30 jours."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountDialog(false)}
      />

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