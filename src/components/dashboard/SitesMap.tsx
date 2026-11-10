import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { MapPin, Locate, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../contexts/ToastContext';
import { Skeleton } from '../ui/Skeleton';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Type optimisé pour la carte - seulement les champs nécessaires
interface SiteForMap {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number; } | null;
  status?: 'active' | 'archived';
}

// Fix pour les icônes de Leaflet avec Vite (même approche que NewSite.tsx)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Composant pour centrer la carte sur une position
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Créer une icône personnalisée pour les marqueurs
const createCustomIcon = (isDark: boolean) => {
  const borderColor = isDark ? '#1f2937' : 'white';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #34519e;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 16px;
          font-weight: bold;
        ">📍</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface SitesMapProps {
  sites: SiteForMap[];
  isLoading: boolean;
}

export function SitesMap({ sites, isLoading }: SitesMapProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [showInteractionOverlay, setShowInteractionOverlay] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGeolocate = async () => {
    try {
      const { lat, lng } = await getPosition();
      setUserPosition([lat, lng]);
      showToast('success', 'Position mise à jour avec succès !');
    } catch (err: any) {
      showToast('warning', err.message || 'Géolocalisation indisponible.', 6000);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[500px] rounded-3xl bg-slate-900/40 border border-white/10 overflow-hidden">
        <div className="h-full flex flex-col p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1 rounded-2xl overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="h-[500px] rounded-3xl bg-slate-900/40 border border-white/10 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun site avec coordonnées
          </p>
        </div>
      </div>
    );
  }

  // Centre de la France pour vue entière
  const franceCenter: [number, number] = [46.2276, 2.2137];
  const franceZoom = 6;

  // Filtrer les sites avec coordonnées
  const sitesWithCoordinates = sites.filter(site => site.coordinates);

  // Utiliser CartoDB DarkMatter pour le thème dark
  const tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const tileLayerAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <>
      <div className="relative h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
        {/* Overlay "Touchez pour interagir" sur mobile */}
        {isMobile && showInteractionOverlay && (
          <div
            className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl cursor-pointer"
            onClick={() => setShowInteractionOverlay(false)}
          >
            <div className="glass-panel rounded-2xl p-6 mx-4 text-center shadow-xl">
              <p className="text-lg font-semibold text-foreground mb-2">
                Touchez pour interagir
              </p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur la carte pour activer les contrôles
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={franceCenter}
          zoom={franceZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={!isMobile}
          dragging={!isMobile}
          className="rounded-3xl"
        >
          <TileLayer
            attribution={tileLayerAttribution}
            url={tileLayerUrl}
          />
          {sitesWithCoordinates.map((site) => {
            if (!site.coordinates) return null;
            return (
              <Marker
                key={site.id}
                position={[site.coordinates.latitude, site.coordinates.longitude]}
                icon={createCustomIcon(isDark)}
                eventHandlers={{
                  click: () => {
                    navigate(`/sites/${site.id}`);
                  },
                }}
              />
            );
          })}
        </MapContainer>

        {/* Bouton GPS Flottant */}
        <button
          onClick={handleGeolocate}
          disabled={isGeolocating}
          className="absolute bottom-4 right-4 z-[400] w-12 h-12 rounded-full glass-panel shadow-xl flex items-center justify-center hover:bg-white/10 dark:hover:bg-surface-300/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Utiliser ma position"
        >
          {isGeolocating ? (
            <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <Locate className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          )}
        </button>
      </div>
    </>
  );
}
