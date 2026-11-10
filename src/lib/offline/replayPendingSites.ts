import { supabase } from '../supabase';
import {
  listPendingSites,
  removePendingSite,
  updatePendingSite,
} from './pendingSiteQueue';
import { isLikelyNetworkError } from './submitSurveyUpsert';

export interface ReplaySitesResult {
  attempted: number;
  succeeded: number;
  failed: number;
  stillPending: number;
}

async function replaySingleSite(siteId: string): Promise<void> {
  const entry = listPendingSites().find((e) => e.siteId === siteId);
  if (!entry) return;

  const row = {
    id: entry.siteId,
    ...entry.payload,
  };
  const { error } = await supabase
    .from('sites')
    .upsert(row, { onConflict: 'id' })
    .select('id')
    .single();
  if (error) throw error;
  removePendingSite(siteId);
}

export async function replayPendingSites(): Promise<ReplaySitesResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const pending = listPendingSites();
    return { attempted: 0, succeeded: 0, failed: 0, stillPending: pending.length };
  }

  const entries = listPendingSites();
  let succeeded = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await replaySingleSite(entry.siteId);
      succeeded++;
    } catch (err) {
      if (isLikelyNetworkError(err)) {
        updatePendingSite(entry.siteId, {
          attempts: (entry.attempts ?? 0) + 1,
          lastAttemptAt: Date.now(),
          lastError: (err as Error).message,
        });
      } else {
        removePendingSite(entry.siteId);
      }
      failed++;
    }
  }

  const stillPending = listPendingSites().length;
  return { attempted: entries.length, succeeded, failed, stillPending };
}
