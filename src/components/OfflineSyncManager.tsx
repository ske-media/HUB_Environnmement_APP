import { useEffect, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { replayPendingSites } from '../lib/offline/replayPendingSites';
import { pruneOrphanQueuePhotos } from '../lib/offline/pendingSurveyQueue';
import {
  SITE_QUEUE_STORAGE_KEY,
  SITE_QUEUE_UPDATE_EVENT,
  listPendingSites,
} from '../lib/offline/pendingSiteQueue';

/**
 * Moteur de rejeu automatique des fiches en attente.
 *
 * À monter une seule fois à la racine de l'application (cf. `Layout`).
 * - Rejoue la queue au montage (reprise après rechargement d'onglet).
 * - Rejoue la queue à chaque événement `window.online` (reprise réseau).
 * - Affiche un toast vert récapitulatif en cas de synchronisation réussie et
 *   conserve le toast orange persistant tant que des fiches restent en attente.
 */
export function OfflineSyncManager() {
  const { replay, pendingCount } = useSyncQueue();
  const { showToast, removeToast } = useToast();
  const [pendingSitesCount, setPendingSitesCount] = useState<number>(() => listPendingSites().length);
  const lastPendingCount = useRef<number>(pendingCount);
  const lastPendingSitesCount = useRef<number>(pendingSitesCount);

  useEffect(() => {
    let cancelled = false;

    const runReplay = async (reason: 'mount' | 'online') => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      try {
        // Toujours rejouer les sites en premier pour éviter les erreurs de
        // clé étrangère sur les fiches qui référencent un site non encore sync.
        const sitesResult = await replayPendingSites();
        const result = await replay();
        if (cancelled) return;
        if (sitesResult.succeeded > 0) {
          const plural = sitesResult.succeeded > 1 ? 's' : '';
          showToast(
            'success',
            `${sitesResult.succeeded} site${plural} synchronisé${plural}.`,
            5000,
            'offline-replay-sites-success'
          );
        }
        if (result.succeeded > 0) {
          const plural = result.succeeded > 1 ? 's' : '';
          showToast(
            'success',
            `${result.succeeded} fiche${plural} synchronisée${plural}.`,
            5000,
            'offline-replay-success'
          );
        }
        if (result.stillPending === 0 && sitesResult.stillPending === 0) {
          removeToast('offline-pending');
        }
      } catch (err) {
        console.error('[OfflineSyncManager] replay failed', err, { reason });
      }

      try {
        const pruned = await pruneOrphanQueuePhotos();
        if (pruned > 0) {
          console.info(`[OfflineSyncManager] ${pruned} photo(s) locale(s) orpheline(s) purgée(s)`);
        }
      } catch (err) {
        console.warn('[OfflineSyncManager] purge des photos orphelines impossible', err);
      }
    };

    void runReplay('mount');
    const onOnline = () => void runReplay('online');
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [replay, removeToast, showToast]);

  useEffect(() => {
    const totalPending = pendingCount + pendingSitesCount;
    if (totalPending > 0 && (lastPendingCount.current + lastPendingSitesCount.current) !== totalPending) {
      const plural = totalPending > 1 ? 's' : '';
      showToast(
        'warning',
        `${totalPending} élément${plural} en attente de synchronisation.`,
        0,
        'offline-pending'
      );
    } else if (totalPending === 0 && (lastPendingCount.current + lastPendingSitesCount.current) > 0) {
      removeToast('offline-pending');
    }
    lastPendingCount.current = pendingCount;
    lastPendingSitesCount.current = pendingSitesCount;
  }, [pendingCount, pendingSitesCount, showToast, removeToast]);

  useEffect(() => {
    const refreshPendingSitesCount = () => {
      setPendingSitesCount(listPendingSites().length);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SITE_QUEUE_STORAGE_KEY) refreshPendingSitesCount();
    };
    window.addEventListener(SITE_QUEUE_UPDATE_EVENT, refreshPendingSitesCount as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SITE_QUEUE_UPDATE_EVENT, refreshPendingSitesCount as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const totalPending = pendingCount + pendingSitesCount;
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (!isOffline || totalPending === 0) return;

      event.preventDefault();
      event.returnValue =
        "Vous êtes hors-ligne et des éléments ne sont pas encore transmis au serveur. Si vous quittez maintenant, ils seront envoyés automatiquement à votre prochaine connexion.";
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingCount, pendingSitesCount]);

  return null;
}
