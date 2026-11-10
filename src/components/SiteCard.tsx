import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Building2, MoreVertical, PencilIcon, Archive, Trash2, RotateCcw, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Site } from '../types';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';
import { cn } from '../lib/utils';

interface SiteCardProps {
  site: Site;
  activeTab: 'active' | 'archived';
  compactMobile?: boolean;
  onEdit?: (siteId: string) => void;
  onArchive?: (siteId: string) => void;
  onDelete?: (siteId: string) => void;
  onRestore?: (siteId: string) => void;
  isDeleting?: boolean;
  isArchiving?: boolean;
  isRestoring?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
}

// Fonction pour générer un gradient unique basé sur l'ID du site
const generateGradient = (id: string): string => {
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  const saturation = 60 + (Math.abs(hash) % 20);
  const lightness = 50 + (Math.abs(hash) % 15);
  
  return `linear-gradient(135deg, hsl(${hue1}, ${saturation}%, ${lightness}%), hsl(${hue2}, ${saturation}%, ${lightness - 10}%))`;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const OSM_TILE_ZOOM = 13;
const shimmerClass =
  'animate-shimmer bg-gradient-to-r from-surface-200 via-surface-300 to-surface-200 bg-[length:200%_100%] rounded';

const getOsmTileUrl = (lat: number, lng: number, zoom = OSM_TILE_ZOOM): string => {
  const safeLat = Math.max(Math.min(lat, 85.0511), -85.0511);
  const safeLng = ((lng + 180) % 360 + 360) % 360 - 180;
  const tileCount = 2 ** zoom;

  const x = Math.floor(((safeLng + 180) / 360) * tileCount);
  const latRad = (safeLat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileCount
  );

  return `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};

export function SiteCard({
  site,
  activeTab,
  compactMobile = false,
  onEdit,
  onArchive,
  onDelete,
  onRestore,
  isDeleting = false,
  isArchiving = false,
  isRestoring = false,
  canEdit = false,
  canDelete = false,
  canRestore = false,
}: SiteCardProps) {
  const navigate = useNavigate();
  const gradient = generateGradient(site.id);
  const timeAgo = formatDistanceToNow(new Date(site.updated_at || site.created_at), {
    addSuffix: true,
    locale: fr,
  });

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractiveElement = 
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[role="menuitem"]') ||
      target.closest('[data-dropdown]');
    
    if (!isInteractiveElement) {
      navigate(`/sites/${site.id}`);
    }
  };

  if (compactMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/sites/${site.id}`);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Voir les détails du site ${site.name}`}
        className="group relative glass-panel rounded-xl border border-primary/20 px-4 py-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{site.name}</h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {site.city || 'Ville non renseignée'}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border",
              activeTab === 'active'
                ? "bg-success/15 text-success border-success/35"
                : "bg-warning/15 text-warning border-warning/35"
            )}
          >
            {activeTab === 'active' ? 'EN COURS' : 'ARCHIVE'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/sites/${site.id}`);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Voir les détails du site ${site.name}`}
      className="group relative glass-panel-lg rounded-2xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
    >
      {/* Zone Média (Haut de carte - 200px) avec Mini-Map */}
      <div className="relative h-[200px] overflow-hidden">
        {/* Mini-Map ou Gradient abstrait */}
        {site.coordinates ? (() => {
          const coords = site.coordinates as { latitude: number; longitude: number } | { lat: number; lng: number };
          const lat = 'latitude' in coords ? coords.latitude : coords.lat;
          const lng = 'longitude' in coords ? coords.longitude : coords.lng;
          
          const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);
          const mapUrl = hasValidCoords ? getOsmTileUrl(lat, lng) : null;
          
          return (
            <div className="absolute inset-0 w-full h-full">
              {mapUrl && (
                <motion.img
                  src={mapUrl}
                  alt={`Carte de ${site.name}`}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
              )}
              {mapUrl && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="h-4 w-4 rounded-full bg-danger border-2 border-white shadow-lg" aria-hidden="true" />
                </div>
              )}
              {/* Fallback gradient animé */}
              <motion.div
                className={cn("absolute inset-0 w-full h-full", mapUrl ? "hidden" : "block")}
                style={{ background: gradient }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/50 to-transparent" />
                <Building2 className="absolute inset-0 m-auto h-24 w-24 text-white/10" />
              </motion.div>
              {/* Overlay sombre */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/40 to-transparent" />
            </div>
          );
        })() : (
          <motion.div
            className="absolute inset-0 w-full h-full"
            style={{ background: gradient }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-surface-900/50 to-transparent" />
            <Building2 className="absolute inset-0 m-auto h-24 w-24 text-white/10" />
          </motion.div>
        )}
        
      </div>

      {/* Zone Contenu (Bas de carte) */}
      <div className="p-6 space-y-4">
        {/* Titre : nom du client */}
        <div>
          <h3 className="text-h2-lg font-bold text-foreground tracking-wide line-clamp-1">
            {site.name || '—'}
          </h3>
          <p className="text-body text-muted-foreground mt-1">
            #{site.project_number}
          </p>
        </div>

        {/* Lieu en secondaire */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center text-body text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
            <span className="truncate">{site.city || '—'}</span>
          </div>
          <div className={cn(
            "shrink-0 px-3 py-1 rounded-full text-caption font-semibold glass-panel border shadow-lg backdrop-blur-md",
            activeTab === 'active'
              ? "bg-success/20 text-success border-success/30 shadow-success-glow"
              : "bg-warning/20 text-warning border-warning/30 shadow-warning-glow"
          )}>
            {activeTab === 'active' ? 'EN COURS' : 'ARCHIVÉ'}
          </div>
        </div>

        {/* Footer de carte */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            {/* Avatar de l'ingénieur */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 via-primary-600/20 to-primary-700/20 border border-primary/30 flex items-center justify-center shadow-indigo-glow"
            >
              <span className="text-caption font-semibold text-primary">
                {getInitials(site.engineer_in_charge)}
              </span>
            </motion.div>
            <div className="hidden lg:flex items-center gap-2 text-caption text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Mis à jour {timeAgo}</span>
            </div>
          </div>

          {/* Menu dropdown et bouton Ouvrir */}
          <div className="flex items-center gap-2">
            {(canEdit || canDelete || canRestore) && (
              <div data-dropdown onClick={(e) => e.stopPropagation()}>
                <DropdownMenu
                  trigger={
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-10 w-10 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  }
                >
                  {activeTab === 'active' ? (
                    <>
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            icon={<PencilIcon className="h-4 w-4" />}
                            onClick={() => onEdit?.(site.id)}
                          >
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            icon={<Archive className="h-4 w-4" />}
                            onClick={() => onArchive?.(site.id)}
                            disabled={isArchiving}
                          >
                            Archiver
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDelete && (
                        <>
                          {canEdit && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => onDelete?.(site.id)}
                            variant="destructive"
                            disabled={isDeleting}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {canRestore && (
                        <DropdownMenuItem
                          icon={<RotateCcw className="h-4 w-4" />}
                          onClick={() => onRestore?.(site.id)}
                          disabled={isRestoring}
                        >
                          Restaurer
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <>
                          {canRestore && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            icon={<Trash2 className="h-4 w-4" />}
                            onClick={() => onDelete?.(site.id)}
                            variant="destructive"
                            disabled={isDeleting}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenu>
              </div>
            )}
            
            {/* Bouton Ouvrir (icône flèche) */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <Link
                to={`/sites/${site.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  whileHover={{ scale: 1.1, x: 4 }}
                  whileTap={{ scale: 0.9 }}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary-600/20 to-primary-700/20 border border-primary/30 flex items-center justify-center shadow-indigo-glow hover:shadow-indigo-glow-lg transition-all"
                >
                  <ArrowRight className="h-4 w-4 text-primary" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SiteCardSkeleton() {
  return (
    <Card className="animate-enter">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <div className={cn('h-6 w-3/4', shimmerClass)}></div>
            <div className={cn('h-4 w-1/3', shimmerClass)}></div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className={cn('h-6 w-16', shimmerClass)}></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4', shimmerClass)}></div>
            <div className={cn('h-4 w-32', shimmerClass)}></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-4', shimmerClass)}></div>
            <div className={cn('h-4 w-40', shimmerClass)}></div>
          </div>
        </div>
      </CardContent>
      <div className="border-t border-muted/50 pt-4 px-6 pb-6">
        <div className="flex items-center gap-2">
          <div className={cn('h-3 w-3', shimmerClass)}></div>
          <div className={cn('h-3 w-32', shimmerClass)}></div>
        </div>
      </div>
    </Card>
  );
}

export function SiteListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <SiteCardSkeleton key={i} />
      ))}
    </div>
  );
}
