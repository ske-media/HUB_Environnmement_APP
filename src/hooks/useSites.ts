import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Site } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { dashboardKeys } from './useDashboardData';

const SURVEY_PHOTOS_BUCKET = 'survey-photos';

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function createOfflineReadError(context: string): Error {
  const error = new Error(
    `Lecture différée (${context}) : hors-ligne, conservation des données en cache.`
  );
  error.name = 'OfflineReadError';
  return error;
}

/**
 * Clés de requête pour TanStack Query
 */
export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (filters: { status?: 'active' | 'archived'; userId?: string; isSuperAdmin?: boolean }) => 
    [...siteKeys.lists(), filters] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
  archivedCount: (filters: { userId?: string; isSuperAdmin?: boolean }) =>
    [...siteKeys.all, 'archivedCount', filters] as const,
};

async function collectStoragePathsRecursively(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(SURVEY_PHOTOS_BUCKET)
      .list(prefix, { limit: pageSize, offset });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const itemPath = `${prefix}/${item.name}`;
      // Les dossiers remontent généralement sans metadata : on explore récursivement.
      if (!item.metadata) {
        const nested = await collectStoragePathsRecursively(itemPath);
        paths.push(...nested);
      } else {
        paths.push(itemPath);
      }
    }

    if (data.length < pageSize) break;
    offset += data.length;
  }

  return paths;
}

/**
 * Prépare le nettoyage des fichiers d'un site dans Supabase Storage.
 * À appeler lors d'une suppression définitive de site.
 */
export async function deleteSiteStorage(siteId: string): Promise<void> {
  if (!siteId) return;

  // Compatibilité avec historiques de chemins de fichiers.
  const prefixes = [`sites/${siteId}`, siteId];
  const uniquePaths = new Set<string>();

  for (const prefix of prefixes) {
    try {
      const paths = await collectStoragePathsRecursively(prefix);
      paths.forEach((p) => uniquePaths.add(p));
    } catch (error) {
      console.warn(`[useSites] Impossible d'explorer le stockage pour ${prefix}`, error);
    }
  }

  const pathsToDelete = Array.from(uniquePaths);
  if (pathsToDelete.length === 0) return;

  const { error } = await supabase.storage
    .from(SURVEY_PHOTOS_BUCKET)
    .remove(pathsToDelete);

  if (error) throw error;
}

/**
 * Hook pour charger les sites actifs avec TanStack Query
 * Mode collaboratif : tous les utilisateurs authentifiés voient tous les sites
 * Utilise stale-while-revalidate : affiche les données en cache immédiatement
 * puis les met à jour en arrière-plan
 */
export function useActiveSites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: siteKeys.list({ status: 'active' }),
    queryFn: async (): Promise<Site[]> => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        // Important: ne jamais retourner [] hors-ligne, sinon on "remplace"
        // le cache valide par une liste vide.
        if (isBrowserOffline()) {
          throw createOfflineReadError('sites actifs');
        }
        throw error;
      }

      return data || [];
    },
    // Les données sont considérées comme "stale" après 5 minutes
    staleTime: 5 * 60 * 1000,
    // Garder les données en cache pendant 10 minutes même si non utilisées
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook pour charger les sites archivés
 * Mode collaboratif : tous les utilisateurs authentifiés voient tous les sites
 */
export function useArchivedSites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: siteKeys.list({ status: 'archived' }),
    queryFn: async (): Promise<Site[]> => {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'archived')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        if (isBrowserOffline()) {
          throw createOfflineReadError('sites archivés');
        }
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook pour obtenir le nombre de sites archivés
 * Mode collaboratif : compte tous les sites archivés pour tous les utilisateurs
 */
export function useArchivedCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: siteKeys.archivedCount({}),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('sites')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'archived')
        .is('deleted_at', null);

      if (error) {
        if (isBrowserOffline()) {
          throw createOfflineReadError('compteur sites archivés');
        }
        throw error;
      }

      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes pour le compteur
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook pour les mutations de sites (delete, archive, restore)
 * Mode collaboratif : tous les utilisateurs authentifiés peuvent modifier tous les sites
 */
export function useSiteMutations() {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: siteKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const deleteSite = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', siteId);

      if (error) throw error;
      return siteId;
    },
    onSuccess: () => {
      invalidateQueries();
    },
  });

  const archiveSite = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ status: 'archived' })
        .eq('id', siteId);

      if (error) throw error;
      return siteId;
    },
    onSuccess: () => {
      invalidateQueries();
    },
  });

  const restoreSite = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('sites')
        .update({ status: 'active' })
        .eq('id', siteId);

      if (error) throw error;
      return siteId;
    },
    onSuccess: () => {
      invalidateQueries();
    },
  });

  return {
    deleteSite,
    archiveSite,
    restoreSite,
    deleteSiteStorage,
  };
}
