import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatUserLabel } from '../lib/utils/userLabel';
import { isAllowedFieldUser } from '../lib/constants/allowedFieldUsers';

interface UseUsersOptions {
  includeHistoricalPreleveurs?: boolean;
  /** Limite la liste aux prélèveurs / chefs de projet autorisés (filtre par UID). */
  restrictToAllowedFieldUsers?: boolean;
}

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (includeHistoricalPreleveurs: boolean, restrictToAllowedFieldUsers: boolean) =>
    [...userKeys.lists(), { includeHistoricalPreleveurs, restrictToAllowedFieldUsers }] as const,
};

export function useUsers(options?: UseUsersOptions) {
  const { user } = useAuth();
  const includeHistoricalPreleveurs = options?.includeHistoricalPreleveurs === true;
  const restrictToAllowedFieldUsers = options?.restrictToAllowedFieldUsers === true;

  const query = useQuery({
    queryKey: userKeys.list(includeHistoricalPreleveurs, restrictToAllowedFieldUsers),
    queryFn: async (): Promise<string[]> => {
      const usersSet = new Set<string>();

      const { data: allUsersData, error: allUsersError } = await supabase.rpc('get_all_users');

      if (!allUsersError && allUsersData) {
        allUsersData.forEach(
          (row: { id: string; full_name: string; first_name?: string; last_name?: string }) => {
            if (restrictToAllowedFieldUsers && !isAllowedFieldUser(row.id)) {
              return;
            }
            const label = formatUserLabel(row);
            if (label && label !== 'Utilisateur inconnu') {
              usersSet.add(label);
            }
          },
        );
      } else {
        console.warn('Erreur lors du chargement de tous les utilisateurs:', allUsersError);
      }

      if (includeHistoricalPreleveurs && !restrictToAllowedFieldUsers) {
        const { data: surveysData, error: surveysError } = await supabase
          .from('surveys')
          .select('specific_data')
          .is('deleted_at', null);

        if (!surveysError && surveysData) {
          surveysData.forEach((survey: any) => {
            if (survey.specific_data?.preleveur) {
              usersSet.add(survey.specific_data.preleveur);
            }
            if (survey.specific_data?.operateur) {
              usersSet.add(survey.specific_data.operateur);
            }
          });
        }
      }

      const currentUserLabel = formatUserLabel({
        full_name: user?.full_name,
        first_name: user?.first_name,
        last_name: user?.last_name,
      });
      if (
        currentUserLabel &&
        (!restrictToAllowedFieldUsers || (user?.id && isAllowedFieldUser(user.id)))
      ) {
        usersSet.add(currentUserLabel);
      }

      return Array.from(usersSet).sort();
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false,
  });

  return {
    ...query,
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
