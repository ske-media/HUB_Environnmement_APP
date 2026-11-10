import { createClient } from '@supabase/supabase-js';
import { retryWithBackoff } from './utils';

// Les identifiants Supabase viennent exclusivement des variables d'environnement
// (voir `.env.example`). Aucune valeur par défaut n'est codée en dur, pour ne
// jamais se connecter par erreur à une autre base.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_STORAGE_KEY = 'hub-environnement-auth';
const REMEMBER_ME_KEY = 'hub-environnement-remember-me';
const REMEMBER_ME_EXPIRY_KEY = 'hub-environnement-remember-me-expiry';

// Validation stricte : vérifier que les variables existent ET ne sont pas vides
if (!supabaseUrl || supabaseUrl.trim() === '' || !supabaseAnonKey || supabaseAnonKey.trim() === '') {
  const missingVars = [];
  if (!supabaseUrl || supabaseUrl.trim() === '') missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  throw new Error(
    `Variables d'environnement Supabase manquantes: ${missingVars.join(', ')}. ` +
    `Vérifiez votre fichier .env ou votre environnement de déploiement.`
  );
}

function isRememberMeEnabled(): boolean {
  const rememberPreference = localStorage.getItem(REMEMBER_ME_KEY);
  const rememberExpiry = localStorage.getItem(REMEMBER_ME_EXPIRY_KEY);

  if (!rememberPreference || !rememberExpiry) {
    return false;
  }

  const expiresAt = Number(rememberExpiry);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REMEMBER_ME_EXPIRY_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return false;
  }

  return rememberPreference === 'true';
}

function readPersistentAuthItem(key: string): string | null {
  const rawStoredValue = localStorage.getItem(key);
  if (!rawStoredValue) return null;

  try {
    const parsedValue = JSON.parse(rawStoredValue) as { value?: string; expiresAt?: number };
    if (typeof parsedValue?.value !== 'string' || typeof parsedValue?.expiresAt !== 'number') {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() > parsedValue.expiresAt) {
      localStorage.removeItem(key);
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(REMEMBER_ME_EXPIRY_KEY);
      return null;
    }

    return parsedValue.value;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

const authStorage = {
  getItem: (key: string) => {
    const rememberMe = isRememberMeEnabled();
    if (rememberMe) {
      return readPersistentAuthItem(key);
    }

    localStorage.removeItem(key);
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const rememberMe = isRememberMeEnabled();
    if (rememberMe) {
      const expiresAt = Date.now() + THIRTY_DAYS_IN_MS;
      localStorage.setItem(
        key,
        JSON.stringify({
          value,
          expiresAt
        })
      );
      localStorage.setItem(REMEMBER_ME_EXPIRY_KEY, String(expiresAt));
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

export function setSessionPersistence(rememberMe: boolean): void {
  if (rememberMe) {
    const expiresAt = Date.now() + THIRTY_DAYS_IN_MS;
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
    localStorage.setItem(REMEMBER_ME_EXPIRY_KEY, String(expiresAt));
    return;
  }

  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(REMEMBER_ME_EXPIRY_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Fonction pour détecter les erreurs réseau critiques
function isNetworkError(error: any): boolean {
  if (!error) return false;
  const message = error.message || String(error);
  return (
    message.includes('Failed to fetch') ||
    message.includes('ERR_NAME_NOT_RESOLVED') ||
    message.includes('ERR_INTERNET_DISCONNECTED') ||
    message.includes('ERR_NETWORK_CHANGED') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError'
  );
}

export const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
  auth: {
    // Laisser Supabase gérer entièrement la persistance de la session
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Forcer explicitement l'utilisation de localStorage pour une meilleure persistance
    storage: authStorage,
    storageKey: AUTH_STORAGE_KEY,
    // Intercepter les erreurs de refresh token pour éviter les boucles infinies
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'hub-environnement'
    }
  }
});

// Intercepter les erreurs de refresh token pour éviter les boucles infinies
let refreshTokenAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
let lastNetworkErrorTime = 0;
const NETWORK_ERROR_COOLDOWN = 30000; // 30 secondes

// Intercepter les appels réseau pour détecter les erreurs répétées
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    const response = await originalFetch.apply(this, args);
    // Réinitialiser le compteur si la requête réussit
    if (response.ok) {
      refreshTokenAttempts = 0;
      lastNetworkErrorTime = 0;
    }
    return response;
  } catch (error: any) {
    // Détecter les erreurs réseau
    if (isNetworkError(error)) {
      const now = Date.now();
      
      // Si c'est une erreur de refresh token et qu'on a déjà trop d'erreurs récentes, arrêter
      if (args[0]?.toString().includes('/auth/v1/token') && args[0]?.toString().includes('grant_type=refresh_token')) {
        refreshTokenAttempts++;
        
        // Si trop d'erreurs récentes, arrêter les tentatives pendant un moment
        if (refreshTokenAttempts >= MAX_REFRESH_ATTEMPTS && (now - lastNetworkErrorTime) < NETWORK_ERROR_COOLDOWN) {
          console.warn('[Supabase] Trop d\'erreurs réseau détectées. Arrêt temporaire du refresh token.');
          throw new Error('Network error: Too many failed attempts');
        }
        
        lastNetworkErrorTime = now;
      }
    }
    
    throw error;
  }
};

// Fonction pour réessayer une requête Supabase
export const retrySupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<{ data: T | null; error: any }> => {
  return retryWithBackoff(
    async () => {
      const result = await queryFn();
      if (result.error) {
        // Si l'erreur est liée à l'authentification, on ne réessaie pas
        if (result.error.status === 401 || result.error.status === 403) {
          throw result.error;
        }
        // Pour les autres erreurs, on réessaie
        throw result.error;
      }
      return result;
    },
    maxRetries
  );
};