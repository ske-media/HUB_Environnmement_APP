import { Search, X, Calendar, Filter, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ENABLED_SURVEY_TYPES } from '../lib/surveyTypes';
import { cn } from '@/lib/utils';

export interface SurveySearchFilters {
  searchText: string;
  types: string[]; // Array pour permettre la sélection multiple
  dateFrom: string;
  dateTo: string;
}

export type SurveySortOption = 'type' | 'date';

interface SurveySearchFiltersProps {
  filters: SurveySearchFilters;
  sortBy: SurveySortOption;
  sortOrder: 'asc' | 'desc';
  onFiltersChange: (filters: SurveySearchFilters) => void;
  onSortChange: (sortBy: SurveySortOption, sortOrder: 'asc' | 'desc') => void;
  onReset: () => void;
}

const surveyTypeLabels: Record<string, string> = {
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
  'icpe_visit': 'Visite ICPE',
};

export function SurveySearchFilters({ 
  filters, 
  sortBy, 
  sortOrder,
  onFiltersChange, 
  onSortChange,
  onReset 
}: SurveySearchFiltersProps) {
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const hasActiveAdvancedFilters = 
    filters.types.length > 0 ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  const hasActiveFilters = filters.searchText !== '' || hasActiveAdvancedFilters;

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
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de fiche - Filtre multi-sélection avec badges */}
        <div>
          <label className="block text-body font-medium text-foreground dark:text-white mb-3">
            Type de fiche
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(surveyTypeLabels)
              .filter(([value]) => ENABLED_SURVEY_TYPES.includes(value as any))
              .map(([value, label]) => {
                const isSelected = filters.types.includes(value);
                return (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const newTypes = isSelected
                        ? filters.types.filter(t => t !== value)
                        : [...filters.types, value];
                      onFiltersChange({ ...filters, types: newTypes });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-indigo-glow"
                        : "glass-panel border-white/10 text-foreground hover:border-primary/50 hover:bg-white/5"
                    )}
                  >
                    {label}
                  </motion.button>
                );
              })}
            {filters.types.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onFiltersChange({ ...filters, types: [] })}
                className="px-3 py-2 rounded-xl text-sm font-medium glass-panel border-2 border-white/10 text-foreground hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-200"
                title="Tout désélectionner"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </div>
          {filters.types.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">Sélectionnez un ou plusieurs types</p>
          )}
        </div>

        {/* Plage de dates */}
        <div>
          <label className="block text-body font-medium text-foreground mb-2">
            <Calendar className="inline h-4 w-4 mr-2" />
            Date de création
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="dateFrom" className="block text-caption text-muted-foreground mb-1">
                Du
              </label>
              <input
                type="date"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                className="block w-full h-12 px-4 rounded-xl glass-panel border border-white/10 text-foreground text-body focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-medium"
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
                className="block w-full h-12 px-4 rounded-xl glass-panel border border-white/10 text-foreground text-body focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <div className="glass-panel-lg rounded-2xl overflow-hidden">
        {/* Barre de recherche simple et tri - Input Design h-12 */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Barre de recherche */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={filters.searchText}
                  onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
                  placeholder="Rechercher dans les fiches..."
                  className="block w-full h-12 pl-12 pr-4 rounded-xl glass-panel border border-white/10 text-foreground text-body placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-medium"
                />
              </div>
            </div>

            {/* Sélecteur de tri - Touch Target 44x44px */}
            <div className="flex gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value as SurveySortOption, sortOrder)}
                  className="h-12 pl-12 pr-10 rounded-xl glass-panel border border-white/10 text-foreground text-body focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 font-medium appearance-none"
                >
                  <option value="type" className="bg-surface-200 dark:bg-surface-200">Type</option>
                  <option value="date" className="bg-surface-200 dark:bg-surface-200">Date</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 w-12 rounded-xl glass-panel border border-white/10 text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 flex items-center justify-center"
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </motion.button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Mobile: Bouton pour ouvrir modale */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsMobileModalOpen(true)}
              className="md:hidden inline-flex items-center gap-2 px-4 py-3 h-12 rounded-xl glass-panel border border-white/10 text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 transition-all duration-200 font-medium"
            >
              <Filter className="h-5 w-5" />
              Filtres
              {hasActiveAdvancedFilters && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-caption font-semibold">
                  !
                </span>
              )}
            </motion.button>

            {/* Desktop: Toggle inline */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className="hidden md:inline-flex items-center gap-2 text-body text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {isAdvancedExpanded ? 'Masquer la recherche avancée' : 'Recherche avancée'}
            </motion.button>

            {hasActiveFilters && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onReset}
                className="inline-flex items-center gap-2 px-4 py-2 h-11 rounded-xl glass-panel border border-white/10 text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 transition-all duration-200 text-body font-medium"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </motion.button>
            )}
          </div>
        </div>

        {/* Recherche avancée - Desktop inline */}
        <AnimatePresence>
          {isAdvancedExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="hidden md:block px-6 pb-6 border-t border-white/10"
            >
              {renderAdvancedFilters()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modale mobile pour filtres avancés - Glassmorphism */}
      <AnimatePresence>
        {isMobileModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-overlay md:hidden"
              onClick={() => setIsMobileModalOpen(false)}
              aria-hidden="true"
            />
            
            {/* Modale */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
              className="fixed inset-x-0 bottom-0 glass-panel-lg rounded-t-2xl shadow-indigo-glow-lg z-modal md:hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <h3 className="text-h2 font-bold text-foreground">Filtres avancés</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsMobileModalOpen(false)}
                  className="h-11 w-11 rounded-xl glass-panel border border-white/10 hover:bg-white/10 dark:hover:bg-surface-300/20 flex items-center justify-center transition-all duration-200"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-foreground" />
                </motion.button>
              </div>
              
              <div className="px-6 py-6">
                {renderAdvancedFilters()}
                
                <div className="mt-6 flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onReset}
                    className="flex-1 h-12 px-4 rounded-xl glass-panel border border-white/10 text-foreground hover:bg-white/10 dark:hover:bg-surface-300/20 transition-all duration-200 font-medium"
                  >
                    Réinitialiser
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleApplyFilters}
                    className="flex-1 h-12 px-4 rounded-xl bg-gradient-to-r from-primary via-primary-600 to-primary-700 text-primary-foreground shadow-indigo-glow-lg hover:shadow-indigo-glow transition-all duration-200 font-medium"
                  >
                    Appliquer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
