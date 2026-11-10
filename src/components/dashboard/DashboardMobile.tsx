import { useState, useEffect, type TouchEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CloudRain, Droplets, LogOut, Play, RefreshCw, Sun, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { useWeather } from '../../hooks/useWeather';
import { ConfirmDialog } from '../ConfirmDialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/Skeleton';

interface DashboardMobileProps {
  userLocation?: { lat: number; lng: number } | null;
}

export function DashboardMobile({ userLocation }: DashboardMobileProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { getPosition } = useGeolocation();
  const { data, isLoading, isFetching, refetch } = useDashboardData();
  const { pendingCount, replay, isReplaying } = useSyncQueue();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(userLocation || null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  const { weather } = useWeather(currentLocation?.lat, currentLocation?.lng);

  const sites = data?.map_points ?? [];
  const isInitialLoading = isLoading && !data;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentLocation) {
      getPosition().then(pos => {
        setCurrentLocation({ lat: pos.lat, lng: pos.lng });
      }).catch(() => {
        // Ignore errors, use userLocation if available
      });
    }
  }, [currentLocation, getPosition]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (window.scrollY > 0 || touchStartY === null) return;
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const delta = Math.max(0, currentY - touchStartY);
    setPullDistance(Math.min(delta, 100));
  };

  const handleTouchEnd = () => {
    if (pullDistance > 70) {
      void refetch();
    }
    setTouchStartY(null);
    setPullDistance(0);
  };

  const firstName = user?.full_name?.split(' ')[0] ?? '';
  const isLocalMode = !isOnline;
  const latestSite = sites[0];
  const previousSites = sites.slice(1, 7);
  const showWeather = Boolean(weather);
  const WeatherIcon = weather?.rain && weather.rain > 40 ? CloudRain : Sun;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleReplay = async () => {
    await replay();
    await refetch();
    if (pendingCount > 0) {
      setShowSyncSuccess(true);
      window.setTimeout(() => setShowSyncSuccess(false), 2800);
    }
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
    <div
      className="space-y-4 pb-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Se déconnecter ?"
        message="La session sera fermée, les données locales restent sécurisées."
        confirmText="Se déconnecter"
        cancelText="Annuler"
        variant="warning"
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await handleSignOut();
        }}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />

      {pullDistance > 0 && (
        <div className="flex items-center justify-center py-1 text-xs text-muted-foreground">
          {pullDistance > 70 ? 'Relâchez pour actualiser' : 'Tirez pour actualiser'}
        </div>
      )}

      {/* En-tête contextuel */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white/80 to-surface-100/70 dark:from-surface-100/55 dark:to-surface-200/35 p-4 shadow-indigo space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-[1.2rem] font-extrabold tracking-tight text-foreground truncate">
              Bonjour{firstName ? ` ${firstName}` : ''}
            </h1>
            <div className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border shadow-sm",
              isLocalMode
                ? "bg-error/15 border-error/35 text-red-300"
                : "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
            )}>
              {isLocalMode ? (
                <WifiOff className="h-3.5 w-3.5" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {isLocalMode ? 'Hors-ligne' : 'En ligne'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-primary/20 bg-white/40 dark:bg-surface-200/30 hover:border-primary/35 hover:bg-white/70 dark:hover:bg-surface-300/35 transition-all duration-200 disabled:opacity-50"
              aria-label="Actualiser"
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4 text-foreground/85', isFetching && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="p-2 rounded-xl border border-error/35 bg-error/10 hover:bg-error/15 transition-all duration-200"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4 text-red-500 dark:text-red-300" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-white/40 dark:bg-surface-200/35 px-3.5 py-3">
          {showWeather ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/45 dark:bg-surface-200/35 border border-primary/20 flex items-center justify-center shrink-0">
                  <WeatherIcon className={cn('h-5 w-5', weather?.rain && weather.rain > 40 ? 'text-blue-300' : 'text-yellow-300')} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg leading-none font-extrabold text-foreground">{weather?.temperature ?? '--'}°C</p>
                  <p className="text-xs text-muted-foreground truncate">{weather?.location || 'Position actuelle'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
                <Droplets className="h-3.5 w-3.5" />
                <span>{weather?.humidity ?? '--'}%</span>
              </div>
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Météo indisponible</span>
          )}
        </div>
      </motion.div>

      {(pendingCount > 0 || showSyncSuccess) && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            'rounded-2xl border px-3 py-2.5 flex items-center justify-between gap-2 backdrop-blur-sm',
            pendingCount > 0
              ? 'bg-orange-100/80 dark:bg-orange-950/30 border-orange-300/70 dark:border-orange-700/50'
              : 'bg-emerald-100/80 dark:bg-emerald-950/30 border-emerald-300/70 dark:border-emerald-700/50'
          )}
        >
          {pendingCount > 0 ? (
            <>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                {pendingCount} fiche{pendingCount > 1 ? 's' : ''} en attente de transmission (stockées en sécurité)
              </p>
              <button
                type="button"
                onClick={handleReplay}
                disabled={isReplaying}
                className="shrink-0 rounded-lg bg-orange-500 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-60 shadow-sm"
              >
                {isReplaying ? 'Sync...' : 'Synchroniser'}
              </button>
            </>
          ) : (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Toutes les données sont à jour
            </p>
          )}
        </motion.div>
      )}

      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        {isInitialLoading ? (
          <div className="space-y-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-white/80 to-surface-100/70 dark:from-surface-100/55 dark:to-surface-200/35 p-4 shadow-indigo">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          latestSite ? (
            <div className="relative overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-primary-900/95 via-primary-800/90 to-primary-700/85 p-5 shadow-[0_0_0_1px_rgba(125,179,255,0.16),0_20px_48px_-18px_rgba(37,99,235,0.7)]">
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary-300/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-accent/25 blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary-100/80">
                  Mission principale
                </p>
                <h2 className="mt-1 text-[1.7rem] leading-tight font-extrabold tracking-tight text-white">
                  {latestSite.name}
                </h2>
                <p className="mt-2 text-sm font-medium text-primary-100/90">
                  {latestSite.city || 'Site terrain'}{latestSite.project_number ? ` • Projet ${latestSite.project_number}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/sites/${latestSite.id}`)}
                className="relative z-10 mt-5 w-full rounded-2xl bg-gradient-to-r from-primary-400 via-primary to-accent text-white py-3.5 text-sm font-extrabold tracking-wide shadow-[0_10px_30px_-12px_rgba(59,130,246,0.9)]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Play className="h-4 w-4" />
                  DEMARRER L'INTERVENTION
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/20 bg-white/55 dark:bg-surface-200/35 px-4 py-3 text-sm text-muted-foreground">
              Aucun site disponible pour le moment.
            </div>
          )
        )}
      </motion.div>

      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-primary-900/95 via-primary-800/90 to-primary-700/85 p-4 space-y-3 shadow-[0_0_0_1px_rgba(125,179,255,0.16),0_20px_48px_-18px_rgba(37,99,235,0.7)]"
      >
        <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-primary-300/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-6 h-20 w-20 rounded-full bg-accent/25 blur-2xl pointer-events-none" />

        <p className="relative z-10 text-[11px] font-bold tracking-[0.14em] uppercase text-primary-100/80">Autres sites</p>
        {previousSites.length > 0 ? (
          <div className="relative z-10 space-y-2">
            {previousSites.map((site) => (
              <Link
                key={site.id}
                to={`/sites/${site.id}`}
                className="block rounded-xl px-3 py-2.5 border border-white/20 bg-white/10 text-sm font-semibold text-white hover:bg-white/15 hover:border-white/35 transition-colors"
              >
                {site.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="relative z-10 text-sm text-primary-100/80">Pas d'autres sites récents.</p>
        )}
        <Link
          to="/sites"
          className="relative z-10 inline-flex items-center justify-center w-full rounded-xl border border-primary-200/35 px-3 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-primary-400/30 via-primary/35 to-accent/35 hover:border-primary-200/55 transition-colors"
        >
          Voir tous les sites
        </Link>
      </motion.div>

    </div>
  );
}
