import { X, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchBar } from './ui/SearchBar';
import { Button } from './ui/Button';
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetClose } from './ui/Sheet';

export interface SiteSearchFilters {
  searchText: string;
  city: string;
  engineerInCharge: string;
  dateFrom: string;
  dateTo: string;
}

export type SiteSortOption = 'name' | 'date' | 'city' | 'project_number';

interface SiteSearchFiltersProps {
  filters: SiteSearchFilters;
  sortBy: SiteSortOption;
  sortOrder: 'asc' | 'desc';
  onFiltersChange: (filters: SiteSearchFilters) => void;
  onSortChange: (sortBy: SiteSortOption, sortOrder: 'asc' | 'desc') => void;
  onReset: () => void;
}

export function SiteSearchFilters({ 
  filters, 
  sortBy, 
  sortOrder,
  onFiltersChange, 
  onSortChange,
  onReset 
}: SiteSearchFiltersProps) {
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const hasActiveAdvancedFilters = 
    filters.city !== '' ||
    filters.engineerInCharge !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    if (isMobileModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileModalOpen]);

  const handleApplyFilters = () => {
    setIsMobileModalOpen(false);
  };

  const renderAdvancedFilters = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ville */}
        <div>
          <label htmlFor="city" className="block text-body font-semibold text-foreground mb-2">
            Ville
          </label>
          <input
            type="text"
            id="city"
            value={filters.city}
            onChange={(e) => onFiltersChange({ ...filters, city: e.target.value })}
            placeholder="Filtrer par ville..."
            className="input-field"
          />
        </div>

        {/* Ingénieur responsable */}
        <div>
          <label htmlFor="engineerInCharge" className="block text-body font-semibold text-foreground mb-2">
            Ingénieur responsable
          </label>
          <input
            type="text"
            id="engineerInCharge"
            value={filters.engineerInCharge}
            onChange={(e) => onFiltersChange({ ...filters, engineerInCharge: e.target.value })}
            placeholder="Filtrer par ingénieur..."
            className="input-field"
          />
        </div>
      </div>

      {/* Plage de dates */}
      <div>
        <label className="block text-body font-semibold text-foreground mb-2">
          <Calendar className="inline h-4 w-4 mr-2 text-primary" />
          Date de création
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateFrom" className="block text-caption text-muted-foreground mb-1">
              Du
            </label>
            <input
              type="date"
              id="dateFrom"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-caption text-muted-foreground mb-1">
              Au
            </label>
            <input
              type="date"
              id="dateTo"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-lg rounded-2xl mb-6"
      >
        {/* Barre de recherche simple et tri */}
        <div className="px-6 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1">
              <SearchBar
                value={filters.searchText}
                onChange={(value) => onFiltersChange({ ...filters, searchText: value })}
                placeholder="Rechercher par client ou numéro de projet..."
                showShortcut={false}
              />
            </div>

            {/* Sélecteur de tri */}
            <div className="flex gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value as SiteSortOption, sortOrder)}
                  className="h-12 pl-11 pr-10 text-body glass-panel border border-white/10 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 appearance-none cursor-pointer transition-all duration-200 font-medium"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23cbd5e1' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                  }}
                >
                  <option value="name" className="bg-surface-900">Client</option>
                  <option value="date" className="bg-surface-900">Date</option>
                  <option value="city" className="bg-surface-900">Lieu</option>
                  <option value="project_number" className="bg-surface-900">Numéro projet</option>
                </select>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 px-4 glass-panel border border-white/10 rounded-xl text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 min-w-[44px]"
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </motion.button>
            </div>
          </div>

          {/* Actions - Mobile: bouton modale, Desktop: toggle inline */}
          <div className="flex items-center justify-between">
            {/* Mobile: Bouton pour ouvrir modale */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="md:hidden"
            >
              <Button
                variant="secondary"
                onClick={() => setIsMobileModalOpen(true)}
                className="min-h-[44px]"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filtres {hasActiveAdvancedFilters && (
                  <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-caption font-semibold shadow-indigo-glow">
                    !
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Desktop: Toggle inline */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className="hidden md:inline-flex items-center text-body text-primary hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors min-h-[44px]"
            >
              <Filter className="h-4 w-4 mr-2" />
              {isAdvancedExpanded ? 'Masquer la recherche avancée' : 'Recherche avancée'}
            </motion.button>

            {(filters.searchText !== '' || hasActiveAdvancedFilters) && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onReset}
                className="inline-flex items-center text-body text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 px-4 py-2 rounded-xl transition-all duration-200 hover:bg-white/5 dark:hover:bg-surface-300/10 min-h-[44px]"
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </motion.button>
            )}
          </div>
        </div>

        {/* Recherche avancée - Desktop inline */}
        <AnimatePresence>
          {isAdvancedExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:block overflow-hidden"
            >
              <div className="px-6 py-6 border-t border-white/10">
                {renderAdvancedFilters()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modale mobile pour filtres avancés */}
      <Sheet open={isMobileModalOpen} onOpenChange={setIsMobileModalOpen} side="bottom">
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
          <SheetClose onClose={() => setIsMobileModalOpen(false)} />
        </SheetHeader>
        <SheetContent>
          <div className="space-y-6">
            {renderAdvancedFilters()}
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={onReset}
                size="lg"
                className="flex-1 min-h-[44px]"
              >
                Réinitialiser
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyFilters}
                size="lg"
                className="flex-1 min-h-[44px]"
              >
                Appliquer
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

