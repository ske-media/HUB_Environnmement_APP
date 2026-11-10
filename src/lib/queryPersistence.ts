import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const PERSIST_KEY = 'hub-shield-query-cache-v1';
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

let didSetup = false;

/**
 * Persiste le cache React Query dans le localStorage pour conserver
 * un état exploitable après rechargement en mode hors-ligne.
 */
export function setupQueryPersistence(queryClient: QueryClient): void {
  if (didSetup || typeof window === 'undefined') return;

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: PERSIST_KEY,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: PERSIST_MAX_AGE_MS,
    buster: 'hub-shield-2026-04',
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });

  didSetup = true;
}
