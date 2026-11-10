import { Link } from 'react-router-dom';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface NearbySitesProps {
  sites: {
    id: string;
    name: string;
    coordinates: { latitude: number; longitude: number } | null;
    updated_at?: string;
  }[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

// Calcul de la distance en km entre deux coordonnées (formule de Haversine)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function NearbySites({ 
  sites, 
  isLoading = false, 
  maxItems = 4,
  className 
}: NearbySitesProps) {
  const { getPosition } = useGeolocation();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const position = await getPosition();
        setUserLocation({ lat: position.lat, lng: position.lng });
        setLocationError(false);
      } catch (error) {
        setLocationError(true);
      }
    };

    fetchLocation();
  }, [getPosition]);

  // Trier les sites par distance si position disponible, sinon par date de modification
  const sortedSites = [...sites].sort((a, b) => {
    if (userLocation && a.coordinates && b.coordinates) {
      const coordsA = a.coordinates as { latitude: number; longitude: number };
      const coordsB = b.coordinates as { latitude: number; longitude: number };
      
      const latA = coordsA.latitude;
      const lngA = coordsA.longitude;
      const latB = coordsB.latitude;
      const lngB = coordsB.longitude;
      
      const distA = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        latA,
        lngA
      );
      const distB = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        latB,
        lngB
      );
      
      return distA - distB;
    }
    // Fallback: trier par date de mise à jour (plus récent en premier)
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  }).slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={cn('glass-panel-lg p-4 sm:p-6 rounded-2xl space-y-4', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8" variant="circular" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(maxItems)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10" variant="circular" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" variant="text" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedSites.length === 0) {
    return (
      <div className={cn('glass-panel-lg p-4 sm:p-6 rounded-2xl', className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-h2 font-semibold text-foreground">Sites récents</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-body text-muted-foreground">
            Aucun site disponible
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-panel-lg p-4 sm:p-6 rounded-2xl space-y-4', className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-indigo-glow-sm">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-h2 font-semibold text-foreground">
          {userLocation ? 'Sites proches' : 'Sites récents'}
        </h3>
      </div>

      <div className="space-y-2">
        {sortedSites.map((site, index) => {
          const coords = site.coordinates as { latitude: number; longitude: number } | null;
          let distance: string | null = null;

          if (userLocation && coords) {
            const distKm = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              coords.latitude,
              coords.longitude
            );
            distance = formatDistance(distKm);
          }

          return (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/sites/${site.id}`}
                className={cn(
                  'block p-3 rounded-xl',
                  'glass-panel border border-white/10',
                  'hover:border-primary/30 hover:shadow-indigo-glow-sm',
                  'transition-all duration-200',
                  'group'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {site.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {distance && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {distance}
                        </span>
                      )}
                      {site.updated_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(site.updated_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
