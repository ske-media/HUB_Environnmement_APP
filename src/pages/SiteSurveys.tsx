import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, FileText, Edit, FilePlus, Download, Trash2, MoreVertical, Loader2, ArrowRightLeft, CloudUpload, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/ui/Skeleton';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { usePermission } from '../hooks/usePermission';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MoveSurveyDialog } from '../components/MoveSurveyDialog';
import { ExportSelectionDialog, type ExportMode } from '../components/ExportSelectionDialog';
import { Modal } from '../components/ui/Modal';
import { CardContent } from '../components/ui/Card';
import {
  exportSurveysAsMergedPdf,
  exportSurveysAsZip,
  type ExportProgress,
  type SurveyToExport,
} from '../lib/pdf-generators/exportSurveys';
import { SurveySearchFilters, type SurveySearchFilters as SurveySearchFiltersType, type SurveySortOption } from '../components/SurveySearchFilters';
import { SURVEY_TYPE_CONFIG, ENABLED_SURVEY_TYPES } from '../lib/surveyTypes';
import type { Site, Survey } from '../types';
import { Button } from '../components/ui/Button';
import { DataTable, DataTableHeader, DataTableRow, DataTableHead, DataTableCell, DataTableBody } from '../components/ui/DataTable';
import { MobileSurveyCard } from '../components/MobileSurveyCard';
import { cn } from '../lib/utils';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { replayPendingSurveyById } from '../lib/offline/replayPendingSurveys';
import { useDeviceContext } from '../hooks/useDeviceContext';
export function SiteSurveys() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { canEditSite, canDeleteSurvey, canEditSurvey } = usePermission();
  const [site, setSite] = useState<Site | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurveys, setSelectedSurveys] = useState<Set<string>>(new Set());
  const [deletingSurvey, setDeletingSurvey] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; surveyId: string | null }>({ isOpen: false, surveyId: null });
  const [moveDialog, setMoveDialog] = useState<{ isOpen: boolean; survey: Survey | null }>({ isOpen: false, survey: null });
  const [exportDialog, setExportDialog] = useState<{ isOpen: boolean; surveys: SurveyToExport[] }>({
    isOpen: false,
    surveys: [],
  });
  const [exportRunning, setExportRunning] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [actionsDialog, setActionsDialog] = useState<{ isOpen: boolean; survey: Survey | null }>({
    isOpen: false,
    survey: null,
  });
  const [searchFilters, setSearchFilters] = useState<SurveySearchFiltersType>({
    searchText: '',
    types: [],
    dateFrom: '',
    dateTo: '',
  });
  const [sortBy, setSortBy] = useState<SurveySortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mobileDisplayCount, setMobileDisplayCount] = useState(10);
  const [manualSyncingSurveyId, setManualSyncingSurveyId] = useState<string | null>(null);
  const [mobileTypeFilter, setMobileTypeFilter] = useState<'all' | 'soil' | 'water' | 'gas'>('all');
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const { isMobile: isPhone, isTablet } = useDeviceContext();
  const isMobile = isPhone || isTablet;

  const { generatePdf, isGenerating, getError } = usePdfGenerator();
  const { pending: pendingQueue } = useSyncQueue();

  const validSiteId = siteId && siteId !== 'undefined' ? siteId : null;
  const siteCacheKey = validSiteId ? `offline-cache:site:${validSiteId}` : null;
  const surveysCacheKey = validSiteId ? `offline-cache:surveys:${validSiteId}` : null;

  const readLocalCache = <T,>(key: string | null): T | null => {
    if (!key || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const writeLocalCache = (key: string | null, value: unknown): void => {
    if (!key || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota ou stockage indisponible: ignorer sans casser le flux utilisateur.
    }
  };

  const handleSelectSurvey = (surveyId: string) => {
    setSelectedSurveys((prev) => {
      const next = new Set(prev);
      if (next.has(surveyId)) {
        next.delete(surveyId);
      } else {
        next.add(surveyId);
      }
      return next;
    });
  };

  const getSurveyTypeLabel = useCallback((type: string): string => {
    const config = SURVEY_TYPE_CONFIG[type] || SURVEY_TYPE_CONFIG['default'];
    return config.name;
  }, []);

  const getSampleName = useCallback((survey: Survey): string | null => {
    if (!survey.specific_data) return null;
    
    const data = survey.specific_data as any;
    
    switch (survey.type) {
      case 'gas':
      case 'tap_water':
      case 'sediment':
        return data.nom_prelevement || null;
      case 'surface_water':
        return data.name || null;
      case 'ambient_air':
        return data.samplingName || null;
      case 'soil':
        return data.designation_point || data.nom_prelevement || data.nom_echantillon || null;
      case 'groundwater':
        return data.nom_ouvrage || null;
      default:
        return data.nom_prelevement || data.name || data.samplingName || data.nom_echantillon || null;
    }
  }, []);

  const closeActionsDialog = useCallback(() => {
    setActionsDialog({ isOpen: false, survey: null });
  }, []);

  const pendingEntriesForSite = useMemo(
    () => pendingQueue.filter((entry) => entry.siteId === validSiteId),
    [pendingQueue, validSiteId]
  );

  const pendingSurveyIds = useMemo(
    () => new Set(pendingEntriesForSite.map((entry) => entry.surveyId)),
    [pendingEntriesForSite]
  );

  const pendingSurveys = useMemo<Survey[]>(() => {
    return pendingEntriesForSite.map((entry) => ({
      id: entry.surveyId,
      site_id: entry.siteId ?? validSiteId ?? '',
      created_by: entry.createdBy ?? 'Hors-ligne',
      created_at: new Date(entry.createdAt).toISOString(),
      updated_at: new Date(entry.lastAttemptAt ?? entry.createdAt).toISOString(),
      deleted_at: null,
      name: entry.name ?? null,
      type: entry.surveyType as Survey['type'],
      specific_data: (entry.specificData ?? {}) as any,
    }));
  }, [pendingEntriesForSite, validSiteId]);

  const surveysWithPending = useMemo(() => {
    const merged = new Map<string, Survey>();
    surveys.forEach((survey) => merged.set(survey.id, survey));
    pendingSurveys.forEach((survey) => merged.set(survey.id, survey));
    return Array.from(merged.values());
  }, [surveys, pendingSurveys]);

  useEffect(() => {
    writeLocalCache(surveysCacheKey, surveysWithPending);
  }, [surveysCacheKey, surveysWithPending]);

  const handleManualSync = useCallback(async (surveyId: string) => {
    if (manualSyncingSurveyId) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showToast('warning', 'Toujours hors-ligne. Réessayez dès que le réseau revient.', 5000);
      return;
    }

    try {
      setManualSyncingSurveyId(surveyId);
      const result = await replayPendingSurveyById(surveyId);
      if (result.succeeded > 0) {
        showToast('success', 'Fiche transmise au serveur avec succès.');
      } else if (result.failed > 0) {
        showToast('warning', "La fiche n'a pas pu être transmise pour le moment.");
      } else {
        showToast('info', 'Cette fiche est déjà synchronisée.');
      }
    } catch (err) {
      console.error('Erreur de synchronisation manuelle:', err);
      showToast('error', "Impossible d'envoyer la fiche au serveur.");
    } finally {
      setManualSyncingSurveyId(null);
    }
  }, [manualSyncingSurveyId, showToast]);

  const filteredSurveys = useMemo(() => {
    let filtered = surveysWithPending.filter((survey) => {
      // Filtrer pour ne garder que les types de fiches autorisés
      if (!ENABLED_SURVEY_TYPES.includes(survey.type as any)) {
        return false;
      }

      if (searchFilters.searchText) {
        const searchLower = searchFilters.searchText.toLowerCase();
        const surveyTypeLabel = getSurveyTypeLabel(survey.type).toLowerCase();
        const surveyName = (survey.name || '').toLowerCase();
        if (!surveyTypeLabel.includes(searchLower) && !surveyName.includes(searchLower)) {
          return false;
        }
      }

      if (searchFilters.types.length > 0) {
        if (!searchFilters.types.includes(survey.type)) {
          return false;
        }
      }

      if (searchFilters.dateFrom) {
        const surveyDate = new Date(survey.created_at);
        const fromDate = new Date(searchFilters.dateFrom);
        if (surveyDate < fromDate) {
          return false;
        }
      }

      if (searchFilters.dateTo) {
        const surveyDate = new Date(survey.created_at);
        const toDate = new Date(searchFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (surveyDate > toDate) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'type':
          comparison = getSurveyTypeLabel(a.type).localeCompare(getSurveyTypeLabel(b.type), 'fr');
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [surveysWithPending, searchFilters, sortBy, sortOrder, getSurveyTypeLabel]);

  const mobileFilteredSurveys = useMemo(() => {
    const waterTypes = new Set(['groundwater', 'surface_water', 'tap_water', 'piezometric']);
    const base = surveysWithPending.filter((survey) => ENABLED_SURVEY_TYPES.includes(survey.type as any));

    const filtered = base.filter((survey) => {
      if (mobileTypeFilter === 'all') return true;
      if (mobileTypeFilter === 'soil') return survey.type === 'soil';
      if (mobileTypeFilter === 'gas') return survey.type === 'gas' || survey.type === 'ambient_air' || survey.type === 'radon_soil';
      return waterTypes.has(survey.type);
    });

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [surveysWithPending, mobileTypeFilter]);

  const displayedSurveys = isMobile ? mobileFilteredSurveys : filteredSurveys;

  const handleSelectAll = () => {
    setSelectedSurveys((prev) => {
      if (prev.size === filteredSurveys.length) {
        return new Set();
      }

      const allIds = new Set<string>();
      filteredSurveys.forEach((survey) => allIds.add(survey.id));
      return allIds;
    });
  };

  const handleResetFilters = () => {
    setSearchFilters({
      searchText: '',
      types: [],
      dateFrom: '',
      dateTo: '',
    });
    setSortBy('date');
    setSortOrder('desc');
  };

  const handleSortChange = (newSortBy: SurveySortOption, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('success', 'EN LIGNE : envoi des données vers le serveur.', 2600, 'site-surveys-online-status');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('warning', 'HORS-LIGNE : mode local activé.', 2600, 'site-surveys-offline-status');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleMoveSurvey = async (targetSiteId: string) => {
    const survey = moveDialog.survey;
    if (!survey) return;
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ site_id: targetSiteId, updated_at: new Date().toISOString() })
        .eq('id', survey.id);
      if (error) throw error;

      setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
      setSelectedSurveys((prev) => {
        if (!prev.has(survey.id)) return prev;
        const next = new Set(prev);
        next.delete(survey.id);
        return next;
      });
      showToast('success', 'La fiche a été déplacée vers le site sélectionné.');
      setMoveDialog({ isOpen: false, survey: null });
    } catch (err: any) {
      console.error('Erreur lors du déplacement de la fiche:', err);
      showToast(
        'error',
        err?.message?.includes('permission')
          ? "Vous n'avez pas la permission de déplacer cette fiche."
          : 'Impossible de déplacer la fiche. Veuillez réessayer.',
        6000,
      );
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      setDeletingSurvey(surveyId);
      const { error } = await supabase
        .from('surveys')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', surveyId);

      if (error) throw error;

      const updatedSurveys = surveys.filter(survey => survey.id !== surveyId);
      setSurveys(updatedSurveys);
      showToast('success', 'La fiche a été déplacée dans la corbeille');
    } catch (err: any) {
      console.error('Error deleting survey:', err);
      showToast('error', 'Impossible de supprimer la fiche. Seul le créateur peut supprimer la fiche.');
    } finally {
      setDeletingSurvey(null);
      setDeleteDialog({ isOpen: false, surveyId: null });
    }
  };

  const openExportDialog = () => {
    if (!site) return;

    const idsToExport =
      selectedSurveys.size > 0 ? Array.from(selectedSurveys) : filteredSurveys.map((s) => s.id);

    if (idsToExport.length === 0) {
      showToast('info', 'Aucune fiche à exporter.');
      return;
    }

    const mapped: SurveyToExport[] = idsToExport
      .map((id) => filteredSurveys.find((s) => s.id === id))
      .filter((s): s is Survey => Boolean(s))
      .map((s) => ({ id: s.id, type: s.type, specific_data: s.specific_data }));

    setExportProgress(null);
    setExportDialog({ isOpen: true, surveys: mapped });
  };

  const handleExportConfirm = async (mode: ExportMode) => {
    if (!site) return;

    const targetSurveys = exportDialog.surveys;
    if (targetSurveys.length === 0) return;

    setExportRunning(true);
    setExportProgress({ completed: 0, total: targetSurveys.length });

    try {
      const options = {
        siteName: site.name,
        siteId: siteId || undefined,
        exportBaseName: `${site.city || site.name}_Fiches`,
        onProgress: (p: ExportProgress) => setExportProgress(p),
      };

      const result =
        mode === 'merge'
          ? await exportSurveysAsMergedPdf(targetSurveys, options)
          : await exportSurveysAsZip(targetSurveys, options);

      if (result.successCount > 0) {
        showToast(
          'success',
          mode === 'merge'
            ? `PDF fusionné généré (${result.successCount} fiche${result.successCount > 1 ? 's' : ''}).`
            : `Archive ZIP générée (${result.successCount} fiche${result.successCount > 1 ? 's' : ''}).`,
        );
      }
      if (result.failures.length > 0) {
        console.warn('Échecs export PDF:', result.failures);
        showToast(
          'warning',
          `${result.failures.length} fiche${result.failures.length > 1 ? 's' : ''} n'ont pu être générées. Détails en console.`,
          6000,
        );
      }
      if (result.successCount === 0 && result.failures.length > 0) {
        return;
      }
      setExportDialog({ isOpen: false, surveys: [] });
    } catch (err: any) {
      console.error('Erreur lors de l\'export:', err);
      showToast('error', err?.message || "Échec de l'export des fiches.");
    } finally {
      setExportRunning(false);
    }
  };

  useEffect(() => {
    const loadSiteAndSurveys = async () => {
      try {
        if (!validSiteId) {
          navigate('/');
          return;
        }

        const { data: siteData, error: siteError } = await supabase
          .from('sites')
          .select('*')
          .eq('id', validSiteId)
          .is('deleted_at', null)
          .single();

        if (siteError) throw siteError;
        setSite(siteData);
        writeLocalCache(siteCacheKey, siteData);

        const { data: surveysData, error: surveysError } = await supabase
          .from('surveys')
          .select('*')
          .eq('site_id', validSiteId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (surveysError) throw surveysError;
        setSurveys(surveysData || []);
        writeLocalCache(surveysCacheKey, surveysData || []);
        setSelectedSurveys(new Set());
        setMobileDisplayCount(10);

        if (surveysData && surveysData.length > 0) {
          const uniqueCreatorIds = Array.from(new Set(surveysData.map(s => s.created_by).filter(Boolean)));
          if (uniqueCreatorIds.length > 0) {
            const { data: userNamesData, error: userNamesError } = await supabase
              .rpc('get_user_names', { user_ids: uniqueCreatorIds });
            
            if (!userNamesError && userNamesData) {
              const namesMap: Record<string, string> = {};
              userNamesData.forEach((user: { id: string; full_name: string }) => {
                namesMap[user.id] = user.full_name;
              });
              setUserNamesMap(namesMap);
            }
          }
        }
      } catch (err: any) {
        const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (isOffline) {
          const cachedSite = readLocalCache<Site>(siteCacheKey);
          const cachedSurveys = readLocalCache<Survey[]>(surveysCacheKey);
          if (cachedSite) setSite(cachedSite);
          if (cachedSurveys) setSurveys(cachedSurveys);
          if (cachedSite || cachedSurveys) {
            return;
          }
        }
        showToast('error', err.message || 'Erreur lors du chargement des données');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSiteAndSurveys();
  }, [validSiteId, showToast, navigate]);

  // Skeleton Loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="glass-panel-lg p-6 rounded-2xl space-y-4">
            <Skeleton className="h-10 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" variant="text" />
              <Skeleton className="h-4 w-3/4" variant="text" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-40" />
            </div>
          </div>
        </div>
        <div className="glass-panel-lg p-6 rounded-2xl space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-body-lg text-muted-foreground">Site non trouvé</p>
      </motion.div>
    );
  }

  // Variantes d'animation pour stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {!isMobile && (
        <motion.div variants={itemVariants}>
          <Breadcrumbs items={[{ label: site.name }]} />
        </motion.div>
      )}
      
      {!isMobile && (
        <motion.div variants={itemVariants}>
          <div className="glass-panel-lg p-6 lg:p-8 rounded-2xl">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-h1-lg font-bold text-foreground mb-4">{site.name}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-body text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{site.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Créé le {new Date(site.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {site && canEditSite(site) && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to={`/sites/${siteId}/edit`} className="block">
                      <Button variant="secondary" className="w-full sm:w-auto min-h-[44px]">
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                    </Link>
                  </motion.div>
                )}
                {site && canEditSite(site) && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link to={`/sites/${siteId}/surveys/new`} className="block">
                      <Button variant="primary" className="w-full sm:w-auto min-h-[44px] bg-gradient-to-r from-primary via-primary-600 to-primary-700 shadow-indigo-glow-lg">
                        <FilePlus className="h-4 w-4 mr-2" />
                        Nouvelle Fiche
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isMobile && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-primary/25 bg-gradient-to-r from-surface-100/85 to-surface-200/65 dark:from-surface-200/45 dark:to-surface-300/35 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-h2-lg font-bold text-foreground truncate">{site.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {site.city || site.location}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-2 py-1 bg-white/35 dark:bg-surface-200/30">
              <div className={cn(
                'relative w-6 h-6 rounded-full flex items-center justify-center border',
                isOnline
                  ? 'bg-emerald-500/15 border-emerald-500/45'
                  : 'bg-error/15 border-error/45'
              )}>
                {isOnline ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-error" />
                )}
              </div>
              <span className={cn('text-[10px] font-extrabold tracking-wide whitespace-nowrap', isOnline ? 'text-emerald-500' : 'text-error')}>
                {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Composant de recherche avancée desktop */}
      {!isMobile && !loading && surveys.length > 0 && (
        <motion.div variants={itemVariants}>
          <SurveySearchFilters
            filters={searchFilters}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onFiltersChange={setSearchFilters}
            onSortChange={handleSortChange}
            onReset={handleResetFilters}
          />
        </motion.div>
      )}

      {/* Liste des sondages */}
      <motion.div variants={itemVariants}>
        <div className="glass-panel-lg rounded-2xl overflow-hidden">
          <div className="p-6 lg:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-center">
                <h2 className="text-h2-lg font-bold text-foreground text-center uppercase tracking-wide">
                  Fiches ({displayedSurveys.length}{surveysWithPending.length !== displayedSurveys.length ? ` / ${surveysWithPending.length}` : ''})
                </h2>
              </div>

              {!isMobile && (
                <div className="flex flex-col gap-4">
                  <div className="text-body text-muted-foreground">
                    {selectedSurveys.size > 0
                      ? `${selectedSurveys.size} fiche${selectedSurveys.size > 1 ? 's' : ''} sélectionnée${selectedSurveys.size > 1 ? 's' : ''}`
                      : 'Aucune fiche sélectionnée'}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {filteredSurveys.length > 0 && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          onClick={handleSelectAll} 
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          {selectedSurveys.size === filteredSurveys.length
                            ? 'Tout désélectionner'
                            : 'Tout sélectionner'}
                        </Button>
                      </motion.div>
                    )}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={openExportDialog}
                        disabled={filteredSurveys.length === 0}
                        className="w-full sm:w-auto min-h-[44px] bg-gradient-to-r from-primary via-primary-600 to-primary-700 shadow-indigo-glow-lg"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {selectedSurveys.size > 0
                          ? `Exporter (${selectedSurveys.size})`
                          : 'Exporter tout'}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 lg:px-8 pb-6 lg:pb-8">
            {displayedSurveys.length === 0 ? (
              // Empty State avec visuel
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="mb-4"
                >
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </motion.div>
                <p className="text-body-lg text-muted-foreground mb-2">
                  {surveysWithPending.length === 0
                    ? 'Aucune fiche pour ce site'
                    : isMobile
                      ? 'Aucune fiche ne correspond au filtre choisi'
                      : 'Aucune fiche ne correspond aux critères de recherche'}
                </p>
                {surveysWithPending.length === 0 && (
                  <Link to={`/sites/${siteId}/surveys/new`} className="mt-4">
                    <Button variant="primary" className="min-h-[44px]">
                      <FilePlus className="h-4 w-4 mr-2" />
                      Créer la première fiche
                    </Button>
                  </Link>
                )}
              </motion.div>
            ) : (
              <>
                {/* Version Desktop - Tableau */}
                <div className="hidden md:block">
                  <DataTable allowHorizontalScroll={false} tableClassName="table-fixed">
                    <DataTableHeader>
                      <DataTableRow>
                        <DataTableHead className="w-10 px-2 text-center">
                          <input
                            type="checkbox"
                            className="h-5 w-5 text-primary border-muted rounded focus:ring-primary cursor-pointer"
                            checked={selectedSurveys.size === filteredSurveys.length && filteredSurveys.length > 0}
                            onChange={handleSelectAll}
                          />
                        </DataTableHead>
                        <DataTableHead className="px-3 text-center">Fiche</DataTableHead>
                        <DataTableHead className="w-[18%] px-3 text-center">Type</DataTableHead>
                        <DataTableHead className="w-[16%] px-3 text-center">Date</DataTableHead>
                        <DataTableHead className="hidden xl:table-cell w-[18%] px-3 text-center">Créé par</DataTableHead>
                        <DataTableHead className="w-[14%] px-3 text-center">Statut</DataTableHead>
                        <DataTableHead className="w-14 px-2 text-center">PDF</DataTableHead>
                        <DataTableHead className="w-12 px-2 text-center">+</DataTableHead>
                      </DataTableRow>
                    </DataTableHeader>
                    <DataTableBody>
                      <AnimatePresence>
                        {filteredSurveys.map((survey, index) => {
                          const isSelected = selectedSurveys.has(survey.id);
                          const surveyConfig = SURVEY_TYPE_CONFIG[survey.type] || SURVEY_TYPE_CONFIG['default'];
                          const Icon = surveyConfig.icon;
                          const sampleName = getSampleName(survey);
                          const displayName = sampleName || survey.name || `Prélèvement du ${new Date(survey.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
                          const isPendingSync = pendingSurveyIds.has(survey.id);

                          return (
                            <motion.tr
                              key={survey.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ delay: index * 0.02 }}
                              className={cn(
                                "group cursor-pointer transition-colors duration-200",
                                isSelected && "bg-primary/10",
                                isPendingSync && "bg-warning/10"
                              )}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                const isInteractiveElement = target.closest('button') || 
                                                            target.closest('input') || 
                                                            target.closest('[role="menuitem"]');
                                if (!isInteractiveElement) {
                                  navigate(`/sites/${siteId}/surveys/${survey.type}/${survey.id}`);
                                }
                              }}
                            >
                              <DataTableCell className="px-2 text-center align-middle">
                                <input
                                  type="checkbox"
                                  className="h-5 w-5 text-primary border-muted rounded focus:ring-primary cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => handleSelectSurvey(survey.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </DataTableCell>
                              <DataTableCell className="px-3 align-middle">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="font-medium text-foreground whitespace-normal break-words text-center leading-tight">
                                    {displayName}
                                  </span>
                                  {isPendingSync && (
                                    <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                                      Hors-ligne
                                    </span>
                                  )}
                                </div>
                              </DataTableCell>
                              <DataTableCell className="px-3 text-center align-middle">
                                <div className={cn(
                                  "inline-flex max-w-full items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-normal",
                                  surveyConfig.bgColorClass,
                                  surveyConfig.colorClass
                                )}>
                                  <Icon className="h-4 w-4" />
                                  <span className="leading-tight">{surveyConfig.name}</span>
                                </div>
                              </DataTableCell>
                              <DataTableCell className="px-3 text-center text-muted-foreground align-middle">
                                {new Date(survey.created_at).toLocaleDateString('fr-FR')}
                              </DataTableCell>
                              <DataTableCell className="hidden xl:table-cell px-3 text-center text-muted-foreground align-middle whitespace-normal break-words">
                                {userNamesMap[survey.created_by] || survey.created_by || 'Utilisateur inconnu'}
                              </DataTableCell>
                              <DataTableCell className="px-3 text-center align-middle">
                                {isPendingSync ? (
                                  <span className="inline-flex items-center justify-center rounded-full border border-warning/40 bg-warning/15 px-2 py-1 text-xs font-medium text-warning whitespace-nowrap">
                                    Non transmise
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center rounded-full border border-success/40 bg-success/10 px-2 py-1 text-xs font-medium text-success whitespace-nowrap">
                                    Synchronisée
                                  </span>
                                )}
                              </DataTableCell>
                              <DataTableCell className="px-2 text-center align-middle">
                                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generatePdf(survey.type, survey.specific_data, site.name);
                                    }}
                                    disabled={isGenerating(survey.type)}
                                    className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                                    title="Télécharger le PDF"
                                  >
                                    {isGenerating(survey.type) ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="h-4 w-4" />
                                    )}
                                  </Button>
                                </motion.div>
                              </DataTableCell>
                              <DataTableCell className="px-2 text-center align-middle">
                                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} className="inline-flex">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 p-0 text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionsDialog({ isOpen: true, survey });
                                    }}
                                    title="Actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              </DataTableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </DataTableBody>
                  </DataTable>
                </div>

                {/* Version Mobile - Gestion de mission minimaliste */}
                <div className="block md:hidden space-y-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/sites/${siteId}/surveys/new`)}
                    className="w-full rounded-2xl bg-primary text-primary-foreground py-4 px-4 min-h-[56px] text-base font-extrabold tracking-wide shadow-indigo-lg border border-primary-600"
                  >
                    + CREER UNE NOUVELLE FICHE
                  </button>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                    {[
                      { id: 'all', label: 'Tous' },
                      { id: 'soil', label: 'Sol' },
                      { id: 'water', label: 'Eau' },
                      { id: 'gas', label: 'Gaz' },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setMobileTypeFilter(pill.id as 'all' | 'soil' | 'water' | 'gas')}
                        className={cn(
                          'shrink-0 rounded-full px-4 py-2.5 min-h-[44px] text-sm font-semibold border transition-colors',
                          mobileTypeFilter === pill.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-indigo-sm'
                            : 'bg-white/70 dark:bg-surface-200/50 text-foreground/85 border-primary/25'
                        )}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {mobileFilteredSurveys.slice(0, mobileDisplayCount).map((survey, index) => {
                      const isPendingSync = pendingSurveyIds.has(survey.id);

                      return (
                        <motion.div
                          key={survey.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <MobileSurveyCard
                            survey={survey}
                            siteId={siteId!}
                            isPendingSync={isPendingSync}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Bouton "Charger plus" pour l'infinite scroll */}
                  {mobileDisplayCount < mobileFilteredSurveys.length && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="pt-4 pb-2"
                    >
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full min-h-[44px]"
                        onClick={() => setMobileDisplayCount(prev => Math.min(prev + 10, mobileFilteredSurveys.length))}
                      >
                        Charger plus ({mobileFilteredSurveys.length - mobileDisplayCount} restant{mobileFilteredSurveys.length - mobileDisplayCount > 1 ? 's' : ''})
                      </Button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modale de confirmation pour la suppression */}
      <Modal
        isOpen={actionsDialog.isOpen}
        onClose={closeActionsDialog}
        className="max-w-md"
      >
        <CardContent className="pt-6 pb-6">
          <div className="space-y-5">
            <div className="space-y-2 pr-10">
              <h3 className="text-h2-lg font-bold text-foreground">Actions de la fiche</h3>
              <p className="text-body text-muted-foreground">
                Choisis ce que tu veux faire avec cette fiche.
              </p>
            </div>

            {actionsDialog.survey && (
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full justify-start"
                  onClick={() => {
                    const survey = actionsDialog.survey;
                    if (!survey || !site) return;
                    generatePdf(survey.type, survey.specific_data, site.name, siteId || undefined);
                    closeActionsDialog();
                  }}
                  disabled={isGenerating(actionsDialog.survey.type)}
                >
                  {isGenerating(actionsDialog.survey.type) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Générer PDF
                </Button>

                {pendingSurveyIds.has(actionsDialog.survey.id) && (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => {
                      void handleManualSync(actionsDialog.survey!.id);
                      closeActionsDialog();
                    }}
                    disabled={manualSyncingSurveyId !== null}
                  >
                    {manualSyncingSurveyId === actionsDialog.survey.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CloudUpload className="h-4 w-4 mr-2" />
                    )}
                    Envoyer au serveur
                  </Button>
                )}

                {(site ? canEditSurvey(actionsDialog.survey, site) : canEditSurvey(actionsDialog.survey)) && (
                  <>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => {
                        const survey = actionsDialog.survey!;
                        navigate(`/sites/${siteId}/surveys/${survey.type}/${survey.id}`);
                        closeActionsDialog();
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full justify-start"
                      onClick={() => {
                        setMoveDialog({ isOpen: true, survey: actionsDialog.survey! });
                        closeActionsDialog();
                      }}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Déplacer vers un autre site
                    </Button>
                  </>
                )}

                {canDeleteSurvey(actionsDialog.survey) && (
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => {
                      setDeleteDialog({ isOpen: true, surveyId: actionsDialog.survey!.id });
                      closeActionsDialog();
                    }}
                    disabled={deletingSurvey === actionsDialog.survey.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Supprimer la fiche"
        message="Êtes-vous sûr de vouloir supprimer cette fiche ? Elle sera déplacée dans la corbeille (Paramètres > Corbeille) et pourra être restaurée."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => deleteDialog.surveyId && handleDeleteSurvey(deleteDialog.surveyId)}
        onCancel={() => setDeleteDialog({ isOpen: false, surveyId: null })}
      />

      <MoveSurveyDialog
        isOpen={moveDialog.isOpen}
        currentSiteId={siteId || null}
        surveyLabel={
          moveDialog.survey
            ? `${getSurveyTypeLabel(moveDialog.survey.type)}${
                getSampleName(moveDialog.survey) ? ` · ${getSampleName(moveDialog.survey)}` : ''
              }`
            : undefined
        }
        onConfirm={handleMoveSurvey}
        onCancel={() => setMoveDialog({ isOpen: false, survey: null })}
      />

      <ExportSelectionDialog
        isOpen={exportDialog.isOpen}
        selectionCount={exportDialog.surveys.length}
        onCancel={() =>
          !exportRunning && setExportDialog({ isOpen: false, surveys: [] })
        }
        onConfirm={handleExportConfirm}
        progress={exportProgress}
        isRunning={exportRunning}
      />
    </motion.div>
  );
}
