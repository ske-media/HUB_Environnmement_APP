import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MapPin, Grid3x3, List, Search, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SiteSearchFilters, type SiteSearchFilters as SiteSearchFiltersType, type SiteSortOption } from '../components/SiteSearchFilters';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SiteCard, SiteListSkeleton } from '../components/SiteCard';
import { SitesTable } from '../components/SitesTable';
import { SitesGrid } from '../components/SitesGrid';
import { cn } from '../lib/utils';
import { useActiveSites, useArchivedSites, useArchivedCount, useSiteMutations } from '../hooks/useSites';
import { usePermission } from '../hooks/usePermission';
import { useDeviceContext } from '../hooks/useDeviceContext';

type TabType = 'active' | 'archived';

export function Sites() {
  const { canDeleteSite, canEditSite, canArchiveSite, canRestoreSite } = usePermission();
  const { isMobile, isTablet } = useDeviceContext();
  const isMobileList = isMobile || isTablet;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; siteId: string | null }>({ isOpen: false, siteId: null });
  const [archiveDialog, setArchiveDialog] = useState<{ isOpen: boolean; siteId: string | null }>({ isOpen: false, siteId: null });
  const [searchFilters, setSearchFilters] = useState<SiteSearchFiltersType>({
    searchText: searchParams.get('search') || '',
    city: '',
    engineerInCharge: '',
    dateFrom: '',
    dateTo: '',
  });
  const [sortBy, setSortBy] = useState<SiteSortOption>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Utiliser TanStack Query pour les sites actifs
  const { 
    data: activeSites = [], 
    isLoading: activeSitesLoading
  } = useActiveSites();

  // Utiliser TanStack Query pour les sites archivés
  const { 
    data: archivedSites = [], 
    isLoading: archivedSitesLoading 
  } = useArchivedSites();

  // Utiliser TanStack Query pour le compteur d'archivés
  const { data: archivedCount = 0 } = useArchivedCount();

  // Mutations pour les actions sur les sites
  const { deleteSite, archiveSite, restoreSite } = useSiteMutations();

  // Déterminer les sites et l'état de chargement selon l'onglet actif
  const sites = activeTab === 'active' ? activeSites : archivedSites;
  const loading = activeTab === 'active' ? activeSitesLoading : archivedSitesLoading;

  const handleDeleteSite = async (siteId: string) => {
    try {
      await deleteSite.mutateAsync(siteId);
      showToast('success', 'Le site a été déplacé dans la corbeille');
      setDeleteDialog({ isOpen: false, siteId: null });
    } catch (err) {
      console.error('Error deleting site:', err);
      showToast('error', 'Impossible de supprimer le site. Seul le créateur peut supprimer le site.');
    }
  };

  const handleArchiveSite = async (siteId: string) => {
    try {
      await archiveSite.mutateAsync(siteId);
      showToast('success', 'Le site a été archivé avec succès');
      setArchiveDialog({ isOpen: false, siteId: null });
    } catch (err) {
      console.error('Error archiving site:', err);
      showToast('error', 'Une erreur est survenue lors de l\'archivage du site');
    }
  };

  const handleRestoreSite = async (siteId: string) => {
    try {
      await restoreSite.mutateAsync(siteId);
      showToast('success', 'Le site a été restauré avec succès');
    } catch (err) {
      console.error('Error restoring site:', err);
      showToast('error', 'Une erreur est survenue lors de la restauration du site');
    }
  };

  const handleEditSite = (siteId: string) => {
    navigate(`/sites/${siteId}/edit`);
  };

  // Fonction de filtrage et tri des sites
  const filteredSites = useMemo(() => {
    let filtered = sites.filter((site) => {
      if (isMobileList) {
        if (!searchFilters.searchText) return true;
        const searchLower = searchFilters.searchText.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(searchLower);
        const matchesProjectNumber = site.project_number.toLowerCase().includes(searchLower);
        return matchesName || matchesProjectNumber;
      }

      // Filtre par texte de recherche (client ou numéro de projet)
      if (searchFilters.searchText) {
        const searchLower = searchFilters.searchText.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(searchLower);
        const matchesProjectNumber = site.project_number.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesProjectNumber) {
          return false;
        }
      }

      // Filtre par ville
      if (searchFilters.city) {
        if (!site.city.toLowerCase().includes(searchFilters.city.toLowerCase())) {
          return false;
        }
      }

      // Filtre par ingénieur responsable
      if (searchFilters.engineerInCharge) {
        const engineer = site.engineer_in_charge || '';
        if (!engineer.toLowerCase().includes(searchFilters.engineerInCharge.toLowerCase())) {
          return false;
        }
      }

      // Filtre par date de création
      if (searchFilters.dateFrom) {
        const siteDate = new Date(site.created_at);
        const fromDate = new Date(searchFilters.dateFrom);
        if (siteDate < fromDate) {
          return false;
        }
      }

      if (searchFilters.dateTo) {
        const siteDate = new Date(site.created_at);
        const toDate = new Date(searchFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Inclure toute la journée
        if (siteDate > toDate) {
          return false;
        }
      }

      return true;
    });

    // Tri des sites
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'fr');
          break;
        case 'date':
          comparison = new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
          break;
        case 'city':
          comparison = (a.city || '').localeCompare(b.city || '', 'fr');
          break;
        case 'project_number':
          comparison = a.project_number.localeCompare(b.project_number, 'fr');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sites, searchFilters, sortBy, sortOrder, isMobileList]);

  const handleResetFilters = () => {
    setSearchFilters({
      searchText: '',
      city: '',
      engineerInCharge: '',
      dateFrom: '',
      dateTo: '',
    });
    setSortBy('name');
    setSortOrder('asc');
  };

  const handleSortChange = (newSortBy: SiteSortOption, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

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
      className="space-y-6 lg:space-y-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-9 w-9 rounded-lg border border-primary/20 hover:border-primary/35"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-h1-lg font-bold text-foreground tracking-wide">Sites</h1>
          </div>
          <p className="text-body text-muted-foreground mt-2">
            Gérez vos chantiers et projets environnementaux
          </p>
        </div>
        {activeTab === 'active' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="sm:ml-4 sm:flex-shrink-0"
          >
            <Link to="/sites/new" className="block w-full sm:w-auto sm:text-right">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Nouveau Site
              </Button>
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* Pill Filters pour les statuts - Style moderne arrondi - Desktop seulement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:flex flex-wrap items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('active')}
          className={cn(
            'px-5 py-2.5 rounded-full font-semibold text-body transition-all duration-300 min-h-[44px]',
            'border-2 backdrop-blur-sm',
            activeTab === 'active'
              ? 'bg-gradient-to-r from-primary/20 via-primary-600/20 to-primary-700/20 border-primary/50 text-primary dark:text-primary-foreground shadow-indigo-glow'
              : 'bg-white/5 dark:bg-surface-200/10 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 hover:border-white/20'
          )}
        >
          <span className="flex items-center gap-2">
            <span>En cours</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-bold',
              activeTab === 'active'
                ? 'bg-primary/30 text-primary dark:text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {activeTab === 'active' ? filteredSites.length : sites.length}
            </span>
          </span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('archived')}
          className={cn(
            'px-5 py-2.5 rounded-full font-semibold text-body transition-all duration-300 min-h-[44px]',
            'border-2 backdrop-blur-sm',
            activeTab === 'archived'
              ? 'bg-gradient-to-r from-warning/20 via-warning/40 to-warning/60 border-warning/50 text-warning shadow-warning-glow'
              : 'bg-white/5 dark:bg-surface-200/10 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 hover:border-white/20'
          )}
        >
          <span className="flex items-center gap-2">
            <span>Terminé</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-bold',
              activeTab === 'archived'
                ? 'bg-warning/30 text-warning'
                : 'bg-muted text-muted-foreground'
            )}>
              {activeTab === 'archived' ? filteredSites.length : archivedCount ?? '...'}
            </span>
          </span>
        </motion.button>
      </motion.div>

      {/* Composant de recherche avancée avec toggle de vue (desktop seulement) */}
      {!loading && sites.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Toggle de vue - Desktop seulement */}
          <div className="hidden lg:flex items-center justify-end">
            <div className="flex items-center gap-2 glass-panel rounded-xl p-1 border border-white/10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all duration-200",
                  viewMode === 'grid'
                    ? "bg-primary/20 text-primary dark:text-primary-foreground shadow-indigo-glow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Vue mosaïque"
              >
                <Grid3x3 className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all duration-200",
                  viewMode === 'list'
                    ? "bg-primary/20 text-primary dark:text-primary-foreground shadow-indigo-glow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Vue liste"
              >
                <List className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
          
          {!isMobileList ? (
            <SiteSearchFilters
              filters={searchFilters}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onFiltersChange={setSearchFilters}
              onSortChange={handleSortChange}
              onReset={handleResetFilters}
            />
          ) : (
            <div className="lg:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchFilters.searchText}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({
                      ...prev,
                      searchText: e.target.value,
                    }))
                  }
                  placeholder="Rechercher un site..."
                  className="w-full h-11 rounded-xl border border-primary/25 bg-white/55 dark:bg-surface-200/35 pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40"
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {loading ? (
        <SiteListSkeleton />
      ) : filteredSites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="py-16 text-center">
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
                <MapPin className="mx-auto h-16 w-16 text-muted-foreground" />
              </motion.div>
              <h3 className="mt-4 text-h2 font-bold text-foreground">
                {sites.length === 0
                  ? activeTab === 'active' ? 'Aucun site actif' : 'Aucun site archivé'
                  : 'Aucun site ne correspond aux critères de recherche'}
              </h3>
              <p className="mt-2 text-body text-muted-foreground">
                {sites.length === 0
                  ? activeTab === 'active' 
                    ? 'Commencez par créer un nouveau site ou consultez les archives.'
                    : 'Les sites archivés apparaîtront ici.'
                  : 'Essayez de modifier vos critères de recherche.'}
              </p>
              {activeTab === 'active' && sites.length === 0 && (
                <div className="mt-6">
                  <Link to="/sites/new">
                    <Button variant="primary">
                      <Plus className="h-5 w-5 mr-2" />
                      Nouveau Site
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Mobile : Cartes Riches avec animations stagger */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden"
          >
            {filteredSites.map((site, index) => (
              <motion.div
                key={site.id}
                variants={itemVariants}
                custom={index}
              >
                <SiteCard
                  site={site}
                  activeTab={activeTab}
                  compactMobile
                  onEdit={handleEditSite}
                  onArchive={(canArchiveSite(site)) ? (id) => setArchiveDialog({ isOpen: true, siteId: id }) : undefined}
                  onDelete={(canDeleteSite(site)) ? (id) => setDeleteDialog({ isOpen: true, siteId: id }) : undefined}
                  onRestore={handleRestoreSite}
                  isDeleting={deleteSite.isPending && deleteDialog.siteId === site.id}
                  isArchiving={archiveSite.isPending && archiveDialog.siteId === site.id}
                  isRestoring={restoreSite.isPending}
                  canEdit={canEditSite(site)}
                  canDelete={canDeleteSite(site)}
                  canRestore={canRestoreSite(site)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Desktop : Vue mosaïque ou liste selon le toggle */}
          <motion.div
            variants={itemVariants}
            className="hidden lg:block"
          >
            {viewMode === 'grid' ? (
              <SitesGrid
                sites={filteredSites}
                activeTab={activeTab}
                onEdit={handleEditSite}
                onArchive={(id) => {
                  const site = filteredSites.find(s => s.id === id);
                  if (site && canArchiveSite(site)) {
                    setArchiveDialog({ isOpen: true, siteId: id });
                  }
                }}
                onDelete={(id) => {
                  const site = filteredSites.find(s => s.id === id);
                  if (site && canDeleteSite(site)) {
                    setDeleteDialog({ isOpen: true, siteId: id });
                  }
                }}
                onRestore={handleRestoreSite}
                isDeleting={deleteSite.isPending}
                isArchiving={archiveSite.isPending}
                isRestoring={restoreSite.isPending}
                canEdit={canEditSite}
                canDelete={canDeleteSite}
                canRestore={canRestoreSite}
              />
            ) : (
              <SitesTable
                sites={filteredSites}
                activeTab={activeTab}
                onEdit={handleEditSite}
                onArchive={(id) => {
                  const site = filteredSites.find(s => s.id === id);
                  if (site && canArchiveSite(site)) {
                    setArchiveDialog({ isOpen: true, siteId: id });
                  }
                }}
                onDelete={(id) => {
                  const site = filteredSites.find(s => s.id === id);
                  if (site && canDeleteSite(site)) {
                    setDeleteDialog({ isOpen: true, siteId: id });
                  }
                }}
                onRestore={handleRestoreSite}
                isDeleting={deleteSite.isPending}
                isArchiving={archiveSite.isPending}
                isRestoring={restoreSite.isPending}
                canEdit={canEditSite}
                canDelete={canDeleteSite}
                canRestore={canRestoreSite}
              />
            )}
          </motion.div>
        </>
      )}

      {/* Modale de confirmation pour la suppression */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Supprimer le site"
        message="Êtes-vous sûr de vouloir supprimer ce site ? Il sera déplacé dans la corbeille (Paramètres > Corbeille) et pourra être restauré."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => deleteDialog.siteId && handleDeleteSite(deleteDialog.siteId)}
        onCancel={() => setDeleteDialog({ isOpen: false, siteId: null })}
      />

      {/* Modale de confirmation pour l'archivage */}
      <ConfirmDialog
        isOpen={archiveDialog.isOpen}
        title="Archiver le site"
        message="Êtes-vous sûr de vouloir archiver ce site ?"
        confirmText="Archiver"
        cancelText="Annuler"
        variant="warning"
        onConfirm={() => archiveDialog.siteId && handleArchiveSite(archiveDialog.siteId)}
        onCancel={() => setArchiveDialog({ isOpen: false, siteId: null })}
      />
    </motion.div>
  );
}