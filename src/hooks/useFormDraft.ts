import { useCallback, useEffect, useRef, useState } from 'react';

/** Toute chaîne au-delà de 5k caractères est exclue du brouillon. */
const MAX_STRING_LENGTH = 5_000;

const DEBOUNCE_MS = 2000;

export function buildFormDraftKey(formType: string, siteId: string): string {
  return `draft_${formType}_${siteId}`;
}

function isLikelyLargeBase64String(s: string): boolean {
  if (s.startsWith('data:') && s.includes('base64')) return true;
  const compact = s.replace(/\s+/g, '');
  if (compact.length < 128) return false;
  if (compact.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

/**
 * Parcourt récursivement les données et supprime File, Blob, Uint8Array,
 * les URLs `blob:` (invalides dès le rechargement de page) et toute chaîne
 * suspecte (base64/data-url) ou > 5k caractères.
 */
export function sanitizeForFormDraft<T>(data: T): T {
  const visit = (input: unknown): unknown => {
    if (input instanceof File || input instanceof Blob || input instanceof Uint8Array) {
      return undefined;
    }
    if (input === null) return null;
    if (typeof input === 'string') {
      if (input.startsWith('blob:')) return undefined;
      if (input.length > MAX_STRING_LENGTH) return undefined;
      if (isLikelyLargeBase64String(input)) return undefined;
      return input;
    }
    if (typeof input !== 'object') return input;
    if (input instanceof Date) return input.toISOString();

    if (Array.isArray(input)) {
      return input.map((item) => {
        const next = visit(item);
        return next === undefined ? null : next;
      });
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const next = visit(value);
      if (next !== undefined) {
        out[key] = next;
      }
    }
    return out;
  };

  return visit(data) as T;
}

export interface UseFormDraftOptions {
  formType: string;
  siteId: string | undefined;
  /** Si false, aucune lecture/écriture (ex. mode édition). */
  enabled?: boolean;
}

export interface UseFormDraftResult<T> {
  storageKey: string | null;
  /** Enregistre après 2 s sans nouvelle mise à jour. */
  scheduleSave: (data: T) => void;
  /** Supprime l’entrée localStorage et met à jour hasDraft. */
  clearDraft: () => void;
  /** Lit et parse le brouillon ; null si absent ou JSON invalide. */
  readDraft: () => T | null;
  /** Présence d’une entrée non vide dans localStorage pour cette clé. */
  hasDraft: boolean;
  /** Re-synchronise hasDraft depuis le stockage (ex. après navigation). */
  refreshDraftPresence: () => void;
}

function readRawDraft(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function initialHasDraftForKey(storageKey: string | null): boolean {
  if (!storageKey || typeof window === 'undefined') return false;
  const raw = readRawDraft(storageKey);
  return Boolean(raw && raw.length > 0);
}

export function useFormDraft<T>(options: UseFormDraftOptions): UseFormDraftResult<T> {
  const { formType, siteId, enabled = true } = options;
  const storageKey = siteId && enabled ? buildFormDraftKey(formType, siteId) : null;

  const [hasDraft, setHasDraft] = useState(() => initialHasDraftForKey(storageKey));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshDraftPresence = useCallback(() => {
    if (!storageKey) {
      setHasDraft(false);
      return;
    }
    const raw = readRawDraft(storageKey);
    setHasDraft(Boolean(raw && raw.length > 0));
  }, [storageKey]);

  useEffect(() => {
    refreshDraftPresence();
  }, [refreshDraftPresence]);

  const readDraft = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const raw = readRawDraft(storageKey);
      if (raw === null || raw === '') return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[useFormDraft] Impossible de supprimer le brouillon', e);
    }
    setHasDraft(false);
  }, [storageKey]);

  const flushSave = useCallback(
    (data: T) => {
      if (!storageKey) return;
      try {
        const sanitized = sanitizeForFormDraft(data);
        const json = JSON.stringify(sanitized);
        localStorage.setItem(storageKey, json);
        setHasDraft(true);
      } catch (e) {
        console.warn('[useFormDraft] Sauvegarde du brouillon impossible', e);
      }
    },
    [storageKey],
  );

  const scheduleSave = useCallback(
    (data: T) => {
      if (!storageKey) return;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        flushSave(data);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [storageKey, flushSave],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    storageKey,
    scheduleSave,
    clearDraft,
    readDraft,
    hasDraft,
    refreshDraftPresence,
  };
}
