/**
 * File d'attente offline des créations/mises à jour de sites.
 */
export const SITE_QUEUE_STORAGE_KEY = 'pending_sites_v1';
export const SITE_QUEUE_UPDATE_EVENT = 'pending-sites:updated';

export interface PendingSiteEntry {
  siteId: string;
  payload: {
    name: string;
    location: string | null;
    city: string | null;
    project_number: string;
    project_manager: string | null;
    engineer_in_charge: string | null;
    drilling_company: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    user_id: string | null;
    status?: 'active' | 'archived';
  };
  createdAt: number;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: number;
}

function notifyUpdate(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SITE_QUEUE_UPDATE_EVENT));
}

function readRaw(): PendingSiteEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SITE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingSiteEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRaw(entries: PendingSiteEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(SITE_QUEUE_STORAGE_KEY);
    } else {
      localStorage.setItem(SITE_QUEUE_STORAGE_KEY, JSON.stringify(entries));
    }
  } catch (err) {
    console.error('[pendingSiteQueue] écriture impossible', err);
  }
}

export function listPendingSites(): PendingSiteEntry[] {
  return readRaw();
}

export function upsertPendingSite(entry: PendingSiteEntry): void {
  const all = readRaw();
  const idx = all.findIndex((e) => e.siteId === entry.siteId);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  writeRaw(all);
  notifyUpdate();
}

export function updatePendingSite(siteId: string, patch: Partial<PendingSiteEntry>): void {
  const all = readRaw();
  const idx = all.findIndex((e) => e.siteId === siteId);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...patch };
  writeRaw(all);
  notifyUpdate();
}

export function removePendingSite(siteId: string): void {
  const all = readRaw();
  const filtered = all.filter((e) => e.siteId !== siteId);
  if (filtered.length !== all.length) {
    writeRaw(filtered);
    notifyUpdate();
  }
}
