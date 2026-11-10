import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Loader2, Locate, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useToast } from '../contexts/ToastContext';
import { useUsers } from '../hooks/useUsers';
import { withPreservedUserSelection } from '../lib/constants/allowedFieldUsers';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSiteMutations } from '../hooks/useSites';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SiteSchema, type SiteFormData } from '../schema/siteSchema';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { submitSiteUpsert } from '../lib/offline/submitSiteUpsert';

// Leaflet : les icônes par défaut ne sont pas résolues par le bundler, on les charge depuis le CDN.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [46.603354, 1.888334];

const visibleMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type GeoSearchResult = {
  x: number;
  y: number;
  label: string;
  raw?: unknown;
};

const REVERSE_REQUEST_TYPE = 1;

function LocationMarker({ 
  position, 
  onMapClick,
}: { 
  position: L.LatLng | null;
  onMapClick: (pos: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return position === null ? null : (
    <>
      <Marker position={position} icon={visibleMarkerIcon} />
      <Circle center={position} radius={1000} pathOptions={{ color: '#34519e', fillColor: '#34519e', fillOpacity: 0.1 }} />
    </>
  );
}

function ChangeMapView({ 
  position, 
  zoom,
}: { 
  position: L.LatLng | null;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!position) {
      return;
    }

    map.flyTo([position.lat, position.lng], zoom, {
      animate: true,
      duration: 0.6,
    });
  }, [position, zoom, map]);

  return null;
}

function extractCityFromRawResult(raw?: unknown) {
  const rawRecord = (raw ?? {}) as Record<string, unknown>;
  const address = (rawRecord.address as Record<string, string> | undefined) ?? {};
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    ''
  );
}

export function NewSite() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { siteId } = useParams();
  const isEditMode = Boolean(siteId);
  const effectiveSiteId = useMemo(() => {
    if (siteId) return siteId;
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `site-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, [siteId]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [isMobile, setIsMobile] = useState(false);
  const [showInteractionOverlay, setShowInteractionOverlay] = useState(true);
  const [drillingCompanyOther, setDrillingCompanyOther] = useState('');
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<GeoSearchResult[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  
  const { getPosition, isLoading: isGeolocating } = useGeolocation();
  const { showToast } = useToast();
  const { data: projectManagers = [], isLoading: loadingProjectManagers, refetch: refetchProjectManagers } = useUsers({
    restrictToAllowedFieldUsers: true,
  });
  const { data: operators = [], isLoading: loadingOperators, refetch: refetchOperators } = useUsers();
  const { deleteSite } = useSiteMutations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const geosearchProvider = useMemo(
    () =>
      new OpenStreetMapProvider({
        params: {
          addressdetails: 1,
          'accept-language': 'fr',
          countrycodes: 'fr',
        },
      }),
    []
  );

  // Forcer le refetch des utilisateurs au montage pour avoir les données à jour
  useEffect(() => {
    refetchProjectManagers();
    refetchOperators();
  }, [refetchProjectManagers, refetchOperators]);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Vérifier si la géolocalisation est disponible
  useEffect(() => {
    setIsGeolocationAvailable('geolocation' in navigator);
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, reset, watch } = useForm<SiteFormData>({
    resolver: zodResolver(SiteSchema),
  });
  const locationField = register('location');
  const locationValue = watch('location') || '';
  const projectManagerValue = watch('projectManager');
  const projectManagerOptions = withPreservedUserSelection(projectManagers, projectManagerValue);

  useEffect(() => {
    if (isEditMode) {
      loadSiteData();
    }
  }, [siteId]);

  const loadSiteData = async () => {
    if (!siteId) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .is('deleted_at', null)
        .single();
      if (fetchError) throw fetchError;
      if (data) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`offline-cache:site:${siteId}`, JSON.stringify(data));
        }
        // On remplit le formulaire avec les données chargées
        const drillingCompany = data.drilling_company || '';
        const predefinedCompanies = ['KAD Environnement', 'Astaruscle Environnement', 'Touss\'Fora', 'BVS Environnement'];
        const isOtherCompany = drillingCompany && !predefinedCompanies.includes(drillingCompany);
        
        reset({
          name: data.name || '',
          projectNumber: data.project_number || '',
          location: data.location || '',
          city: data.city || '',
          projectManager: data.project_manager || '',
          engineers: data.engineer_in_charge || '',
          drillingCompany: isOtherCompany ? 'Autre' : drillingCompany,
        });
        
        if (isOtherCompany) {
          setDrillingCompanyOther(drillingCompany);
        }
        if (data.coordinates) {
          const loadedPosition = new L.LatLng(data.coordinates.latitude, data.coordinates.longitude);
          setPosition(loadedPosition);
          setMapZoom(17);
        }
      }
    } catch (err) {
      const cacheKey = `offline-cache:site:${siteId}`;
      if (typeof navigator !== 'undefined' && navigator.onLine === false && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const data = JSON.parse(raw);
            const drillingCompany = data.drilling_company || '';
            const predefinedCompanies = ['KAD Environnement', 'Astaruscle Environnement', 'Touss\'Fora', 'BVS Environnement'];
            const isOtherCompany = drillingCompany && !predefinedCompanies.includes(drillingCompany);
            reset({
              name: data.name || '',
              projectNumber: data.project_number || '',
              location: data.location || '',
              city: data.city || '',
              projectManager: data.project_manager || '',
              engineers: data.engineer_in_charge || '',
              drillingCompany: isOtherCompany ? 'Autre' : drillingCompany,
            });
            if (isOtherCompany) setDrillingCompanyOther(drillingCompany);
            if (data.coordinates) {
              const loadedPosition = new L.LatLng(data.coordinates.latitude, data.coordinates.longitude);
              setPosition(loadedPosition);
              setMapZoom(17);
            }
            showToast('warning', 'Mode hors-ligne: affichage des dernières données synchronisées.');
            return;
          }
        } catch {
          // Continuer vers le message d'erreur standard.
        }
      }
      console.error('Error loading site:', err);
      setError('Erreur lors du chargement des données du site.');
    }
  };

  const onSubmit: SubmitHandler<SiteFormData> = async (formData) => {
    try {
      setLoading(true);
      setError('');
    

      const drillingCompanyValue = formData.drillingCompany === 'Autre' ? drillingCompanyOther : formData.drillingCompany;
      
      const siteData = {
        name: formData.name,
        location: formData.location?.trim() || null,
        city: formData.city?.trim() || null,
        project_number: formData.projectNumber,
        project_manager: formData.projectManager || null,
        engineer_in_charge: formData.engineers || null,
        drilling_company: drillingCompanyValue || null,
        coordinates: position ? { latitude: position.lat, longitude: position.lng } : null,
        user_id: user?.id ?? null,
      };

      const result = await submitSiteUpsert({
        siteId: effectiveSiteId,
        payload: siteData,
      });

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `offline-cache:site:${effectiveSiteId}`,
          JSON.stringify({ id: effectiveSiteId, ...siteData })
        );
      }

      if (result.status === 'pending') {
        showToast(
          'warning',
          "Synchronisation du site en attente — l'enregistrement sera envoyé dès le retour du réseau.",
          0,
          'site-sync-queue-banner'
        );
        navigate('/sites');
        return;
      }
      navigate(`/sites/${result.siteId}`);

    } catch (err) {
      console.error('Error saving site:', err);
      setError(`Une erreur est survenue lors de la sauvegarde du site.`);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocodeFromPosition = useCallback(
    async (newPosition: L.LatLng) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Hors-ligne: geocodage inverse indisponible');
      }

      const endpoint = geosearchProvider.endpoint({
        query: {
          lat: newPosition.lat,
          lon: newPosition.lng,
        },
        type: REVERSE_REQUEST_TYPE as 0 | 1,
      });

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Erreur lors du reverse geocoding');
      }

      const data = await response.json();
      const parsed = geosearchProvider.parse({ data }) as GeoSearchResult[];
      return parsed[0] ?? null;
    },
    [geosearchProvider]
  );

  useEffect(() => {
    const query = locationValue.trim();

    if (!showLocationSuggestions || query.length < 3) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingLocation(true);

    const timer = window.setTimeout(async () => {
      try {
        const results = await geosearchProvider.search({ query });
        if (!isCancelled) {
          setLocationSuggestions(results.slice(0, 8) as GeoSearchResult[]);
        }
      } catch (err) {
        if (!isCancelled) {
          setLocationSuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsSearchingLocation(false);
        }
      }
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [geosearchProvider, locationValue, showLocationSuggestions]);

  const syncPosition = useCallback(
    async (
      newPosition: L.LatLng,
      options?: { shouldReverseGeocode?: boolean; zoom?: number; silentError?: boolean }
    ) => {
      const shouldReverseGeocode = options?.shouldReverseGeocode ?? true;
      const nextZoom = options?.zoom ?? 17;

      setPosition(newPosition);
      setMapZoom(nextZoom);

      if (!shouldReverseGeocode) {
        return;
      }

      try {
        const result = await reverseGeocodeFromPosition(newPosition);
        if (result?.label) {
          setValue('location', result.label, { shouldValidate: true });
          setShowLocationSuggestions(false);
          setLocationSuggestions([]);
        }
        const extractedCity = extractCityFromRawResult(result?.raw);
        if (extractedCity) {
          setValue('city', extractedCity, { shouldValidate: true });
        }
      } catch (err) {
        console.error('Error reverse geocoding:', err);
        if (!options?.silentError) {
          showToast('error', 'Erreur lors de la récupération de l\'adresse');
        }
      }
    },
    [reverseGeocodeFromPosition, setValue, showToast]
  );

  const handleMapClick = useCallback(
    (newPosition: L.LatLng) => {
      void syncPosition(newPosition, { shouldReverseGeocode: true, zoom: 17, silentError: true });
    },
    [syncPosition]
  );

  const handleGeoSearchSelection = useCallback(
    (selection: GeoSearchResult) => {
      const nextPosition = new L.LatLng(selection.y, selection.x);
      setPosition(nextPosition);
      setMapZoom(17);
      setValue('location', selection.label, { shouldValidate: true });
      setValue('city', extractCityFromRawResult(selection.raw), { shouldValidate: true });
      setShowLocationSuggestions(false);
      setLocationSuggestions([]);
      showToast('success', 'Adresse selectionnee et formulaire synchronise');
    },
    [setValue, showToast]
  );

  const handleGeolocate = useCallback(async () => {
    try {
      const { lat, lng } = await getPosition();
      const newPosition = new L.LatLng(lat, lng);
      await syncPosition(newPosition, { shouldReverseGeocode: true, zoom: 17 });
      showToast('success', 'Position GPS appliquée avec succès !');
    } catch (err: any) {
      showToast('warning', err.message || 'La géolocalisation n\'est pas disponible. Vous pouvez continuer sans position GPS ou cliquer sur la carte pour définir une position.');
    }
  }, [getPosition, showToast, syncPosition]);

  const handleDeleteSite = async () => {
    if (!siteId) return;

    try {
      await deleteSite.mutateAsync(siteId);
      showToast('success', 'Le site a été déplacé dans la corbeille');
      setDeleteDialogOpen(false);
      navigate('/sites');
    } catch (err) {
      console.error('Error deleting site:', err);
      showToast('error', 'Impossible de supprimer le site. Seul le créateur peut supprimer le site.');
    }
  };

  return (
    <div className="w-full lg:max-w-6xl lg:mx-auto">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4 p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{isEditMode ? 'Modifier le Site' : 'Nouveau Site'}</h1>
      </div>
      
      {/* On utilise le handleSubmit de react-hook-form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex">
              <div className="flex-shrink-0"><AlertCircle className="h-5 w-5 text-red-400" /></div>
              <div className="ml-3"><p className="text-sm text-red-700 dark:text-red-400">{error}</p></div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="glass-panel p-6 rounded-xl">
              <div className="space-y-6">
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground dark:text-white">Nom du client</label>
                  <input
                    type="text"
                    id="name"
                    {...register("name")} // On utilise register
                    className="mt-1 block w-full rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white placeholder-muted-foreground shadow-sm focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20 sm:text-sm px-4 py-3 transition-all duration-200"
                  />
                  {/* Affichage automatique de l'erreur venant de Zod */}
                  {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="projectNumber" className="block text-sm font-medium text-foreground dark:text-white">Numéro d'affaire</label>
                  <input
                    type="text"
                    id="projectNumber"
                    {...register("projectNumber")}
                    className="mt-1 block w-full rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white placeholder-muted-foreground shadow-sm focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20 sm:text-sm px-4 py-3 transition-all duration-200"
                  />
                  {errors.projectNumber && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.projectNumber.message}</p>}
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-foreground dark:text-white mb-1">
                    Adresse
                    <span className="text-xs text-muted-foreground ml-2">
                      (optionnel - recherchez ici puis cliquez sur la carte si besoin)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="location"
                      {...locationField}
                      value={locationValue}
                      onChange={(e) => {
                        locationField.onChange(e);
                        setShowLocationSuggestions(true);
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      onBlur={(e) => {
                        locationField.onBlur(e);
                        window.setTimeout(() => setShowLocationSuggestions(false), 150);
                      }}
                      className="mt-1 block w-full rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white placeholder-muted-foreground shadow-sm focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20 sm:text-sm px-4 py-3 pr-10 transition-all duration-200"
                      placeholder="Rechercher une adresse..."
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 mt-1 mr-3 flex items-center">
                      {isSearchingLocation && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                    </div>

                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-[450] mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200/70 bg-white shadow-lg dark:border-white/10 dark:bg-surface-200">
                        {locationSuggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.x}-${suggestion.y}-${suggestion.label}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleGeoSearchSelection(suggestion);
                            }}
                            className="w-full border-b border-slate-200/40 px-4 py-2.5 text-left text-sm text-foreground hover:bg-[#34519e]/10 dark:border-white/10 dark:text-white dark:hover:bg-[#34519e]/25"
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.location && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location.message}</p>}
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-foreground dark:text-white mb-1">
                    Commune
                    <span className="text-xs text-muted-foreground ml-2">
                      (optionnel - automatiquement extraite de l'adresse ou saisie manuelle)
                    </span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    {...register("city")}
                    className="mt-1 block w-full rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white placeholder-muted-foreground shadow-sm focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20 sm:text-sm px-4 py-3 transition-all duration-200"
                    placeholder="Saisissez ou sélectionnez une commune..."
                  />
                  {errors.city && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground dark:text-white">
                      Position sur la carte
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        (optionnel)
                      </span>
                    </label>
                  </div>
                  <div className="relative h-[300px] lg:h-[400px] rounded-lg border border-slate-200/40 dark:border-white/10">
                    {/* Overlay "Touchez pour interagir" sur mobile */}
                    {isMobile && showInteractionOverlay && (
                      <div
                        className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg cursor-pointer"
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
                      center={DEFAULT_CENTER}
                      zoom={6}
                      className="h-full w-full rounded-lg"
                      scrollWheelZoom={!isMobile}
                      dragging={!isMobile}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker 
                        position={position} 
                        onMapClick={handleMapClick}
                      />
                      <ChangeMapView position={position} zoom={mapZoom} />
                    </MapContainer>

                    {/* Bouton GPS Flottant - Optionnel */}
                    {isGeolocationAvailable && (
                      <button
                        type="button"
                        onClick={handleGeolocate}
                        disabled={isGeolocating}
                        className="absolute bottom-4 right-4 z-[400] w-12 h-12 rounded-full glass-panel shadow-xl flex items-center justify-center hover:bg-white/10 dark:hover:bg-surface-300/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Utiliser ma position (optionnel)"
                        title="Utiliser ma position GPS (optionnel)"
                      >
                        {isGeolocating ? (
                          <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                        ) : (
                          <Locate className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-80">
            <div className="glass-panel p-6 rounded-xl space-y-6">
              <div>
                <label htmlFor="projectManager" className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Chef de projet</label>
                <select
                  id="projectManager"
                  {...register("projectManager")}
                  className="w-full px-4 py-3 text-sm rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#34519e] focus:border-[#34519e] transition-all duration-200"
                  disabled={loadingProjectManagers}
                >
                  <option value="">Sélectionner un chef de projet...</option>
                  {projectManagerOptions.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
                {errors.projectManager && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.projectManager.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="engineers" className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Opérateur</label>
                <select
                  id="engineers"
                  {...register("engineers")}
                  className="w-full px-4 py-3 text-sm rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#34519e] focus:border-[#34519e] transition-all duration-200"
                  disabled={loadingOperators}
                >
                  <option value="">Sélectionner un opérateur...</option>
                  {operators.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
                {errors.engineers && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.engineers.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="drillingCompany" className="block text-sm font-medium text-foreground dark:text-white mb-1.5">Entreprise de Forage</label>
                <select
                  id="drillingCompany"
                  {...register("drillingCompany")}
                  className="w-full px-4 py-3 text-sm rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#34519e] focus:border-[#34519e] transition-all duration-200"
                >
                  <option value="">Sélectionner une entreprise...</option>
                  <option value="KAD Environnement">KAD Environnement</option>
                  <option value="Astaruscle Environnement">Astaruscle Environnement</option>
                  <option value="Touss'Fora">Touss'Fora</option>
                  <option value="BVS Environnement">BVS Environnement</option>
                  <option value="Autre">Autre</option>
                </select>
                {watch('drillingCompany') === 'Autre' && (
                  <input
                    type="text"
                    value={drillingCompanyOther}
                    onChange={(e) => setDrillingCompanyOther(e.target.value)}
                    className="mt-2 block w-full rounded-md border border-slate-200/40 dark:border-white/10 bg-white/90 dark:bg-surface-200 text-foreground dark:text-white placeholder-muted-foreground shadow-sm focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20 sm:text-sm px-4 py-3 transition-all duration-200"
                    placeholder="Nom de l'entreprise..."
                  />
                )}
                {errors.drillingCompany && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.drillingCompany.message}</p>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#34519e] hover:bg-[#34519e]/90 disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : (isEditMode ? 'Enregistrer les modifications' : 'Créer le site')}
              </button>
            </div>
            {isEditMode && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleteSite.isPending}
                  className="w-full inline-flex items-center justify-center py-2 px-4 border border-red-500/40 shadow-sm text-sm font-medium rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteSite.isPending ? 'Suppression...' : 'Supprimer le site'}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Supprimer le site"
        message="Êtes-vous sûr de vouloir supprimer ce site ? Il sera déplacé dans la corbeille (Paramètres > Corbeille) et pourra être restauré."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        onConfirm={handleDeleteSite}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}