import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration du QueryClient pour TanStack Query
 * 
 * Options importantes :
 * - staleTime: Temps avant que les données soient considérées comme "stale" (5 minutes)
 * - cacheTime: Temps de rétention en cache après qu'une requête ne soit plus utilisée (10 minutes)
 * - refetchOnWindowFocus: Recharger automatiquement quand la fenêtre reprend le focus
 * - retry: Nombre de tentatives en cas d'erreur
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      // Utiliser stale-while-revalidate : afficher les données en cache immédiatement
      // puis les mettre à jour en arrière-plan
      refetchOnMount: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});
