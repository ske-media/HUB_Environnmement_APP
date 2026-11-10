import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, ArrowRight, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { SURVEY_TYPE_CONFIG, ENABLED_SURVEY_TYPES } from '../../lib/surveyTypes';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

interface RecentSurvey {
  id: string;
  created_at: string;
  type: string;
  name: string | null;
  site_id: string;
  sites: { name: string } | null;
}

interface RecentActivityProps {
  surveys: RecentSurvey[];
  isLoading: boolean;
}

export function RecentActivity({ surveys, isLoading }: RecentActivityProps) {
  // Skeleton au lieu de Spinner
  if (isLoading) {
    return (
      <div className="glass-panel-lg p-6 lg:p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10" variant="circular" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 pl-6">
              <Skeleton className="w-4 h-4 mt-2" variant="circular" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" variant="text" />
                <Skeleton className="h-3 w-1/3" variant="text" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty State avec visuel
  if (surveys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-lg p-6 lg:p-8 rounded-2xl"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-indigo-glow">
            <History className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
          <h2 className="text-h2 font-bold text-foreground">Activité récente</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
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
          <p className="text-body text-muted-foreground mb-2">
            Aucune fiche récente
          </p>
          <p className="text-caption text-muted-foreground">
            Les fiches créées apparaîtront ici
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-lg p-6 lg:p-8 rounded-2xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-indigo-glow">
          <History className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
        </div>
        <h2 className="text-h2 font-bold text-foreground">Activité récente</h2>
      </div>
      
      <div className="relative">
        {/* Ligne verticale de la timeline */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary-600/50 to-transparent" />
        
        <ul className="space-y-4 relative">
          {surveys
            .filter(survey => ENABLED_SURVEY_TYPES.includes(survey.type as any))
            .map((survey, index) => {
            const config = SURVEY_TYPE_CONFIG[survey.type] || SURVEY_TYPE_CONFIG.default;
            const Icon = config.icon;
            const displayName = survey.name || config.name;
            const siteName = survey.sites?.name || 'Site inconnu';
            const timeAgo = formatDistanceToNow(new Date(survey.created_at), {
              addSuffix: true,
              locale: fr,
            });

            // Couleur de la bille selon le type
            const dotColor = survey.type === 'soil' ? 'bg-warning shadow-warning-glow' :
                            survey.type === 'groundwater' ? 'bg-primary shadow-indigo-glow' :
                            survey.type === 'site_visit' ? 'bg-secondary shadow-indigo-glow' :
                            'bg-muted-foreground';

            return (
              <motion.li
                key={survey.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-14 group"
              >
                {/* Bille de couleur avec effet glow */}
                <div className={cn(
                  "absolute left-4 top-2 h-4 w-4 rounded-full border-2 border-background z-10",
                  dotColor
                )} />
                
                <Link
                  to={`/sites/${survey.site_id}`}
                  className="block p-4 rounded-xl glass-panel border border-white/10 hover:border-white/20 transition-all duration-300 group-hover:shadow-indigo-glow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          config.colorClass === 'text-yellow-600' ? 'text-warning' :
                          config.colorClass === 'text-blue-600' ? 'text-primary' :
                          'text-muted-foreground'
                        )} />
                        <p className="text-body font-semibold text-foreground truncate">
                          {displayName}
                        </p>
                      </div>
                      <p className="text-body text-muted-foreground truncate">
                        {siteName}
                      </p>
                      <p className="text-caption text-muted-foreground mt-1">
                        {timeAgo}
                      </p>
                    </div>
                    
                    {/* Flèche qui apparaît au survol */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </motion.div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
