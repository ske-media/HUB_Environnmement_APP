import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PendingSurveyEntry,
  QUEUE_STORAGE_KEY,
  QUEUE_UPDATE_EVENT,
  listPendingSurveys,
} from '../lib/offline/pendingSurveyQueue';
import { ReplayResult, replayPendingSurveys } from '../lib/offline/replayPendingSurveys';

export interface UseSyncQueueReturn {
  pending: PendingSurveyEntry[];
  pendingCount: number;
  replay: () => Promise<ReplayResult>;
  isReplaying: boolean;
  refresh: () => void;
}

/**
 * Hook partagé autour de la file d'attente des fiches.
 *
 * - Fournit la liste courante (mise à jour par event `pending-surveys:updated`
 *   et par les `storage` events multi-onglets).
 * - Fournit un `replay()` sérialisé : deux appels concurrents ne rejouent pas
 *   deux fois la queue.
 */
export function useSyncQueue(): UseSyncQueueReturn {
  const [pending, setPending] = useState<PendingSurveyEntry[]>(() => listPendingSurveys());
  const [isReplaying, setIsReplaying] = useState(false);
  const replayInFlight = useRef<Promise<ReplayResult> | null>(null);

  const refresh = useCallback(() => {
    setPending(listPendingSurveys());
  }, []);

  useEffect(() => {
    const onUpdate = () => refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === QUEUE_STORAGE_KEY) refresh();
    };
    window.addEventListener(QUEUE_UPDATE_EVENT, onUpdate as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(QUEUE_UPDATE_EVENT, onUpdate as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  const replay = useCallback(async (): Promise<ReplayResult> => {
    if (replayInFlight.current) return replayInFlight.current;
    setIsReplaying(true);
    const p = (async () => {
      try {
        return await replayPendingSurveys();
      } finally {
        setIsReplaying(false);
        replayInFlight.current = null;
        setPending(listPendingSurveys());
      }
    })();
    replayInFlight.current = p;
    return p;
  }, []);

  return {
    pending,
    pendingCount: pending.length,
    replay,
    isReplaying,
    refresh,
  };
}
