import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Building2, FileText, Calendar, Map, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useDashboardData } from '../../hooks/useDashboardData';
import { ENABLED_SURVEY_TYPES } from '../../lib/surveyTypes';
import { StatCard } from './StatCard';
import { RecentActivity } from './RecentActivity';
import { SitesMap } from './SitesMap';
import { WeatherWidget } from './WeatherWidget';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';

interface DashboardDesktopProps {
  userLocation?: { lat: number; lng: number } | null;
}

export function DashboardDesktop({ userLocation }: DashboardDesktopProps) {
  const { user } = useAuth();
  const { getPosition } = useGeolocation();
  const { data, isLoading, isFetching, refetch } = useDashboardData();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const enabledSurveyTypesSet = useMemo(() => new Set<string>(ENABLED_SURVEY_TYPES), []);

  // Générer des sparklines stables (pas de hasard entre deux rafraîchissements)
  const generateSparklineData = (metricKey: string, baseValue: number, count: number = 7): number[] => {
    const metricSeed = metricKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

    return Array.from({ length: count }, (_, i) => {
      const oscillation = Math.sin((metricSeed + i) * 0.9) * 0.08;
      const slope = (i - (count - 1) / 2) * 0.02;
      const factor = 1 + oscillation + slope;
      return Math.max(0, Math.round(baseValue * factor));
    });
  };

  const mapPoints = data?.map_points ?? [];
  const recentSites = mapPoints.slice(0, 5);
  const recentSurveys = (data?.recent_activity ?? [])
    .filter((survey) => enabledSurveyTypesSet.has(survey.type))
    .map((survey) => ({
      ...survey,
      sites: survey.site_name ? { name: survey.site_name } : null,
    }));

  const stats = data?.stats ?? {
    active_sites_count: 0,
    total_surveys_count: 0,
    recent_surveys_count: 0,
    growth_percentage: 0,
  };
  const sparklineData = useMemo(
    () => ({
      activeSites: generateSparklineData('active_sites_count', stats.active_sites_count),
      totalSurveys: generateSparklineData('total_surveys_count', stats.total_surveys_count),
      recentSurveys: generateSparklineData('recent_surveys_count', stats.recent_surveys_count),
    }),
    [stats.active_sites_count, stats.total_surveys_count, stats.recent_surveys_count]
  );

  const isInitialLoading = isLoading && !data;

  useEffect(() => {
    if (!currentLocation) {
      const fetchUserLocation = async () => {
        try {
          const position = await getPosition();
          setCurrentLocation({ lat: position.lat, lng: position.lng });
        } catch (error) {
          console.error('Erreur lors de la récupération de la position:', error);
          if (mapPoints.length > 0 && mapPoints[0].coordinates) {
            const coords = mapPoints[0].coordinates;
            setCurrentLocation({ lat: coords.latitude, lng: coords.longitude });
          }
        }
      };

      fetchUserLocation();
    }
  }, [getPosition, mapPoints, currentLocation]);

  // Formatage de la date du jour
  const today = new Date();
  const dayName = format(today, 'EEEE', { locale: fr });
  const dayNumber = format(today, 'd');
  const monthName = format(today, 'MMMM', { locale: fr });
  const formattedDate = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNumber} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
      {/* En-tête avec salutation, date et actions */}
      <motion.div
        variants={itemVariants}
        className="glass-panel-lg p-6 lg:p-8 rounded-2xl"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-h1-lg font-bold text-foreground tracking-wide mb-2">
              Bonjour{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-primary/20">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-body font-medium text-foreground">{formattedDate}</span>
              </div>
            </div>
          </div>
          
          {/* Actions principales : Nouveau Site et Corbeille */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="glass-panel border border-primary/20 hover:border-primary/35"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Actualiser
            </Button>
            <Link to="/sites/new">
              <Button 
                variant="primary" 
                size="lg" 
                className="bg-gradient-to-r from-primary to-accent"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nouveau Site
              </Button>
            </Link>
            <Link to="/settings?tab=trash">
              <Button 
                variant="secondary" 
                size="lg"
                className="glass-panel border border-primary/20 hover:border-primary/35"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Corbeille
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPIs en ligne horizontale */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Link to="/sites" className="block">
          <StatCard
            icon={Building2}
            title="Sites actifs"
            value={stats.active_sites_count}
            isLoading={isInitialLoading}
            color="blue"
            trendValue={stats.growth_percentage}
            trend={stats.growth_percentage >= 0 ? "ce mois-ci" : "ce mois-ci"}
            sparklineData={sparklineData.activeSites}
            index={0}
          />
        </Link>
        <StatCard
          icon={FileText}
          title="Total fiches"
          value={stats.total_surveys_count}
          isLoading={isInitialLoading}
          color="green"
          trendValue={stats.recent_surveys_count}
          trend="ce mois-ci"
          sparklineData={sparklineData.totalSurveys}
          index={1}
        />
        <StatCard
          icon={Calendar}
          title="Fiches (30j)"
          value={stats.recent_surveys_count}
          isLoading={isInitialLoading}
          color="orange"
          trendValue={stats.growth_percentage}
          trend={stats.growth_percentage >= 0 ? "En hausse" : "En baisse"}
          sparklineData={sparklineData.recentSurveys}
          index={2}
        />
        <div className="glass-panel-lg p-6 rounded-2xl flex flex-col justify-center">
          <WeatherWidget 
            lat={currentLocation?.lat} 
            lng={currentLocation?.lng}
            compact
          />
        </div>
      </motion.div>

      {/* Widget Accès Rapide - Sites Récents */}
      {recentSites.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="glass-panel-lg p-6 lg:p-8 rounded-2xl"
        >
          <h2 className="text-h2-lg font-bold text-foreground tracking-wide mb-6">Accès Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {recentSites.map((site, index) => {
              return (
                <motion.div
                  key={site.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -6 }}
                >
                  <Link
                    to={`/sites/${site.id}`}
                    className={cn(
                      'block p-8 rounded-2xl',
                      'glass-panel-lg',
                      'border border-primary/20',
                      'hover:border-primary/40 hover:shadow-indigo-lg',
                      'transition-all duration-300',
                      'group relative overflow-hidden bg-gradient-to-br from-white/85 to-surface-100/80 dark:from-surface-200/65 dark:to-surface-300/45',
                      'min-h-[160px] flex flex-col justify-between'
                    )}
                  >
                    {/* Effet de brillance au survol */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {site.name}
                        </h3>
                        {site.city && (
                          <p className="text-base font-medium text-muted-foreground/80 mb-4">
                            {site.city}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground/70 pt-2 border-t border-white/10">
                        <span className="truncate">Projet {site.project_number ?? 'N/A'}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Carte Interactive + Activité Récente - Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte (2/3) - Élément central */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 glass-panel-lg overflow-hidden rounded-2xl"
        >
          <div className="px-6 lg:px-8 pt-6 lg:pt-8 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-indigo-sm">
                <Map className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-h2-lg font-bold text-foreground tracking-wide">Vue d'ensemble des Sites</h2>
            </div>
          </div>
          <div className="px-6 lg:px-8 pb-6 lg:pb-8">
            <SitesMap sites={mapPoints} isLoading={isInitialLoading} />
          </div>
        </motion.div>

        {/* Activité Récente (1/3) - Réduite à 5 items */}
        <div className="lg:col-span-1">
          <motion.div variants={itemVariants}>
            <RecentActivity surveys={recentSurveys} isLoading={isInitialLoading} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
