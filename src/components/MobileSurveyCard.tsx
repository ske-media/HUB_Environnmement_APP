import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Survey } from '../types';
import { SURVEY_TYPE_CONFIG } from '../lib/surveyTypes';
import { cn } from '../lib/utils';

const getSampleName = (survey: Survey): string | null => {
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
};

interface MobileSurveyCardProps {
  survey: Survey;
  siteId: string;
  isPendingSync?: boolean;
}

export function MobileSurveyCard({
  survey,
  siteId,
  isPendingSync = false,
}: MobileSurveyCardProps) {
  const navigate = useNavigate();

  const surveyConfig = SURVEY_TYPE_CONFIG[survey.type] || SURVEY_TYPE_CONFIG['default'];
  const Icon = surveyConfig.icon;
  const sampleName = getSampleName(survey);
  const displayName = sampleName || survey.name || 'Sans nom';

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button') || target.closest('input') || target.closest('[role="menuitem"]');

    if (!isInteractiveElement) {
      navigate(`/sites/${siteId}/surveys/${survey.type}/${survey.id}`);
    }
  };

  return (
    <motion.div
      onClick={handleCardClick}
      whileTap={{ scale: 0.98 }}
      className="relative glass-panel-lg rounded-2xl p-4 min-h-[88px] transition-all duration-200 border border-primary/20 hover:border-primary/35 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl',
            surveyConfig.bgColorClass,
            'border border-white/20'
          )}
        >
          <Icon className={cn('h-5 w-5', surveyConfig.colorClass, 'drop-shadow-sm')} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-foreground truncate">{displayName}</p>
            <span
              className={cn(
                'h-3 w-3 rounded-full shrink-0',
                isPendingSync ? 'bg-orange-500' : 'bg-emerald-500'
              )}
              title={isPendingSync ? 'En attente de synchronisation' : 'Synchronisée'}
            />
          </div>

          <div className="mt-1.5 text-sm text-muted-foreground">
            <span className="truncate">{surveyConfig.name}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
