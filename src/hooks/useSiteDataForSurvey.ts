import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type SiteDataForSurvey = {
  name: string | null;
  project_number: string | null;
  city: string | null;
  project_manager: string | null;
  drilling_company: string | null;
};

export function useSiteDataForSurvey(siteId: string | undefined) {
  const query = useQuery({
    queryKey: ['site-data-for-survey', siteId],
    enabled: Boolean(siteId),
    queryFn: async (): Promise<SiteDataForSurvey | null> => {
      if (!siteId) return null;

      const { data, error } = await supabase
        .from('sites')
        .select('name, project_number, city, project_manager, drilling_company')
        .eq('id', siteId)
        .single();

      if (error) throw error;

      return (data ?? null) as SiteDataForSurvey | null;
    },
    staleTime: 0,
    gcTime: 2 * 60 * 1000,
  });

  return {
    siteData: query.data ?? null,
    isLoadingSiteData: query.isLoading,
    errorSiteData: query.error,
  };
}
