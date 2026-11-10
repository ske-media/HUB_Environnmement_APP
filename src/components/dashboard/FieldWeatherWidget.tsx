import { Cloud, CloudRain, Sun, CloudSun, Droplets, Wind, Thermometer } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';

interface FieldWeatherWidgetProps {
  lat?: number;
  lng?: number;
  className?: string;
  compact?: boolean;
}

function getWeatherIcon(condition: string | undefined | null, isDay: boolean = true) {
  if (!condition) {
    return Sun;
  }
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('pluie')) {
    return CloudRain;
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('nuage')) {
    return isDay ? CloudSun : Cloud;
  }
  return Sun;
}

function getWeatherIconColor(condition: string | undefined | null) {
  if (!condition) {
    return 'text-yellow-400';
  }
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('pluie')) {
    return 'text-blue-400';
  }
  if (conditionLower.includes('cloud') || conditionLower.includes('nuage')) {
    return 'text-gray-400';
  }
  return 'text-yellow-400';
}

export function FieldWeatherWidget({ 
  lat, 
  lng, 
  className,
  compact = false 
}: FieldWeatherWidgetProps) {
  const { weather, isLoading, error } = useWeather(lat, lng);

  if (isLoading) {
    return (
      <div className={cn('glass-panel-lg p-4 rounded-2xl', className)}>
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-8 h-8" variant="circular" />
          <Skeleton className="h-5 w-24" />
        </div>
        {!compact && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" variant="text" />
          </div>
        )}
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={cn('glass-panel-lg p-4 rounded-2xl', className)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/20">
            <Sun className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Météo</p>
            <p className="text-xs text-muted-foreground">Indisponible</p>
          </div>
        </div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.description, true);
  const iconColor = getWeatherIconColor(weather.description);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <WeatherIcon className={cn('h-5 w-5', iconColor)} />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {Math.round(weather.temperature)}°
          </span>
          {weather.rain && weather.rain > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {weather.rain}%
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-panel-lg p-4 rounded-2xl', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl bg-primary/10 border border-primary/20')}>
            <WeatherIcon className={cn('h-6 w-6', iconColor)} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Météo</p>
            <p className="text-xs text-muted-foreground">{weather.location || 'Position actuelle'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">
            {Math.round(weather.temperature)}°
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Vent</p>
            <p className="text-sm font-medium text-foreground">
              {weather.windSpeed ? `${weather.windSpeed} km/h` : 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Pluie</p>
            <p className="text-sm font-medium text-foreground">
              {weather.rain ? `${weather.rain}%` : '0%'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Ressenti</p>
            <p className="text-sm font-medium text-foreground">
              {weather.feelsLike ? `${Math.round(weather.feelsLike)}°` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {weather.description && (
        <p className="text-xs text-muted-foreground mt-3 capitalize">
          {weather.description}
        </p>
      )}
    </div>
  );
}
