import { supabase } from '../supabase';
import {
  PendingSiteEntry,
  removePendingSite,
  updatePendingSite,
  upsertPendingSite,
} from './pendingSiteQueue';
import { isLikelyNetworkError } from './submitSurveyUpsert';

export interface SubmitSiteUpsertOptions {
  siteId: string;
  payload: PendingSiteEntry['payload'];
  timeoutMs?: number;
}

export interface SubmitSiteUpsertResult {
  status: 'success' | 'pending';
  siteId: string;
  error?: Error;
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function performSiteUpsertWithTimeout(entry: PendingSiteEntry, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  const upsertPromise = (async () => {
    const row = {
      id: entry.siteId,
      ...entry.payload,
    };
    const { error } = await supabase
      .from('sites')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single()
      .abortSignal(controller.signal);
    if (error) throw error;
  })();

  try {
    await Promise.race([upsertPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  }
}

export async function submitSiteUpsert(
  opts: SubmitSiteUpsertOptions
): Promise<SubmitSiteUpsertResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const entry: PendingSiteEntry = {
    siteId: opts.siteId,
    payload: opts.payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  upsertPendingSite(entry);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    updatePendingSite(opts.siteId, {
      lastAttemptAt: Date.now(),
      lastError: 'offline',
    });
    return { status: 'pending', siteId: opts.siteId };
  }

  try {
    await performSiteUpsertWithTimeout(entry, timeoutMs);
    removePendingSite(opts.siteId);
    return { status: 'success', siteId: opts.siteId };
  } catch (err) {
    if (isLikelyNetworkError(err)) {
      updatePendingSite(opts.siteId, {
        attempts: entry.attempts + 1,
        lastAttemptAt: Date.now(),
        lastError: (err as Error).message,
      });
      return { status: 'pending', siteId: opts.siteId, error: err as Error };
    }
    removePendingSite(opts.siteId);
    throw err;
  }
}
