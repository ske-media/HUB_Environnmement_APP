import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SURVEY_TYPE_CONFIG, ENABLED_SURVEY_TYPES } from '../../lib/surveyTypes';
import { cn } from '@/lib/utils';

// Types de fiches les plus utilisés sur le terrain (priorisés)
// Filtrés pour ne garder que les types autorisés
const PRIORITY_SURVEY_TYPES = [
  'soil',
  'groundwater',
  'gas',
  'site_visit',
  'pid',
  'ambient_air',
  'surface_water',
  'excavation',
].filter(type => ENABLED_SURVEY_TYPES.includes(type as any)) as readonly string[];

interface QuickSurveyGridProps {
  siteId?: string;
  className?: string;
  maxItems?: number;
}

export function QuickSurveyGrid({ siteId, className, maxItems = 8 }: QuickSurveyGridProps) {
  const navigate = useNavigate();
  const params = useParams<{ siteId?: string }>();
  const currentSiteId = siteId || params.siteId;

  const surveyTypes = PRIORITY_SURVEY_TYPES.slice(0, maxItems).map(type => ({
    type,
    config: SURVEY_TYPE_CONFIG[type] || SURVEY_TYPE_CONFIG.default,
  }));

  const handleSurveyClick = (surveyType: string) => {
    if (currentSiteId) {
      navigate(`/sites/${currentSiteId}/surveys/${surveyType}/new`);
    } else {
      // Si pas de site sélectionné, aller à la sélection de site puis création
      navigate('/sites');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-h2 font-semibold text-foreground">Créer une fiche</h3>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {surveyTypes.map(({ type, config }, index) => {
          const Icon = config.icon;
          return (
            <motion.button
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSurveyClick(type)}
              className={cn(
                'flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                'glass-panel border border-white/10',
                'hover:border-primary/30 hover:shadow-indigo-glow-sm',
                'transition-all duration-200',
                'min-h-[100px] sm:min-h-[110px]',
                currentSiteId ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
              )}
              disabled={!currentSiteId}
              title={config.name}
            >
              <div className={cn(
                'p-3 rounded-xl',
                config.bgColorClass,
                'border border-white/20',
                'shadow-sm'
              )}>
                <Icon className={cn('h-6 w-6 sm:h-7 sm:w-7', config.colorClass)} />
              </div>
              <span className={cn(
                'text-xs sm:text-sm font-medium text-center',
                'text-foreground line-clamp-2',
                'leading-tight'
              )}>
                {config.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {!currentSiteId && (
        <p className="text-sm text-muted-foreground text-center">
          Sélectionnez un site pour créer une fiche
        </p>
      )}
    </div>
  );
}
