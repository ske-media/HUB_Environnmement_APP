import { Cloud, Droplets, Sun, CloudRain, MapPin, RefreshCw, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

interface WeatherWidgetProps {
  lat?: number;
  lng?: number;
}

export function WeatherWidget({ lat, lng }: WeatherWidgetProps) {
  const { weather, isLoading, error, refetch } = useWeather(lat, lng);

  const getWeatherIcon = (iconCode: string) => {
    if (iconCode === '01') return Sun;
    if (iconCode === '02' || iconCode === '50') return Cloud;
    if (iconCode === '09' || iconCode === '10') return CloudRain;
    if (iconCode === '11') return CloudRain;
    if (iconCode === '13') return CloudRain;
    return Sun;
  };

  const getRainRiskColor = (rainProbability?: number) => {
    if (!rainProbability) return 'text-muted-foreground';
    if (rainProbability < 30) return 'text-success';
    if (rainProbability < 60) return 'text-warning';
    return 'text-error';
  };

  // Skeleton au lieu de Spinner
  if (isLoading || !weather) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-12 h-12" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" variant="text" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
            <Cloud className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-h2 font-bold text-foreground">Météo</h3>
        </div>
        <p className="text-body text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-indigo-glow"
          >
            <WeatherIcon className="h-6 w-6 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </motion.div>
          <div>
            <h3 className="text-h2 font-bold text-foreground">Météo Chantier</h3>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <p className="text-caption text-muted-foreground">Conditions actuelles</p>
            </div>
          </div>
        </div>
        <motion.button
          onClick={() => refetch?.()}
          whileHover={{ scale: 1.05, rotate: 180 }}
          whileTap={{ scale: 0.95 }}
          className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center transition-all duration-200"
          aria-label="Actualiser la météo"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </motion.button>
      </div>

      {/* Température principale - Plus compacte */}
      <div className="flex items-center gap-4 mb-4">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary-600/20 border border-primary/30 shadow-indigo-glow"
        >
          <WeatherIcon className="h-10 w-10 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <motion.span
              key={weather.temperature}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-foreground"
            >
              {weather.temperature}°
            </motion.span>
            <span className="text-base text-muted-foreground">C</span>
          </div>
          <p className="text-body text-muted-foreground capitalize mt-1">{weather.description}</p>
        </div>
      </div>

      {/* Informations détaillées - 3 colonnes sur une ligne */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
        {/* Pluie - Toujours affichée */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "flex flex-col gap-1 p-3 rounded-xl glass-panel border",
            weather.rain !== undefined && weather.rain > 0
              ? weather.rain < 30 ? "border-success/20" : weather.rain < 60 ? "border-warning/20" : "border-error/20"
              : "border-white/10"
          )}
        >
          <div className="flex items-center gap-1.5">
            <CloudRain className={cn(
              'h-3.5 w-3.5',
              weather.rain !== undefined && weather.rain > 0 ? getRainRiskColor(weather.rain) : "text-muted-foreground"
            )} />
            <span className="text-caption text-muted-foreground">Pluie</span>
          </div>
          <span className={cn(
            'text-base font-bold',
            weather.rain !== undefined && weather.rain > 0 ? getRainRiskColor(weather.rain) : "text-foreground"
          )}>
            {weather.rain !== undefined ? `${weather.rain}%` : '0%'}
          </span>
        </motion.div>
        
        {/* Humidité */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-1 p-3 rounded-xl glass-panel border border-white/10"
        >
          <div className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-caption text-muted-foreground">Humidité</span>
          </div>
          <span className="text-base font-bold text-foreground">{weather.humidity}%</span>
        </motion.div>
        
        {/* Vent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-1 p-3 rounded-xl glass-panel border border-white/10"
        >
          <div className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-caption text-muted-foreground">Vent</span>
          </div>
          <span className="text-base font-bold text-foreground">{weather.windSpeed || 0} km/h</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
