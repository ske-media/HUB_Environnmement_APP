import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
  active_sites_count: number;
  total_surveys_count: number;
  recent_surveys_count: number;
  growth_percentage: number;
}

export interface DashboardRecentActivityItem {
  id: string;
  type: string;
  name: string | null;
  created_at: string;
  site_name: string | null;
  site_id: string;
}

export interface DashboardMapPoint {
  id: string;
  name: string;
  city: string | null;
  project_number: string | null;
  coordinates: { latitude: number; longitude: number } | null;
}

export interface DashboardSummary {
  stats: DashboardStats;
  recent_activity: DashboardRecentActivityItem[];
  map_points: DashboardMapPoint[];
}

const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  stats: {
    active_sites_count: 0,
    total_surveys_count: 0,
    recent_surveys_count: 0,
    growth_percentage: 0,
  },
  recent_activity: [],
  map_points: [],
};

function normalizeDashboardSummary(raw: unknown): DashboardSummary {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_DASHBOARD_SUMMARY;
  }

  const data = raw as Partial<DashboardSummary>;

  return {
    stats: {
      active_sites_count: Number(data.stats?.active_sites_count ?? 0),
      total_surveys_count: Number(data.stats?.total_surveys_count ?? 0),
      recent_surveys_count: Number(data.stats?.recent_surveys_count ?? 0),
      growth_percentage: Number(data.stats?.growth_percentage ?? 0),
    },
    recent_activity: Array.isArray(data.recent_activity)
      ? data.recent_activity.map((item) => ({
          id: String(item.id),
          type: String(item.type),
          name: item.name ?? null,
          created_at: String(item.created_at),
          site_name: item.site_name ?? null,
          site_id: String(item.site_id),
        }))
      : [],
    map_points: Array.isArray(data.map_points)
      ? data.map_points.map((item) => ({
          id: String(item.id),
          name: String(item.name),
          city: item.city ?? null,
          project_number: item.project_number ?? null,
          coordinates:
            item.coordinates &&
            typeof item.coordinates === 'object' &&
            typeof item.coordinates.latitude === 'number' &&
            typeof item.coordinates.longitude === 'number'
              ? {
                  latitude: item.coordinates.latitude,
                  longitude: item.coordinates.longitude,
                }
              : null,
        }))
      : [],
  };
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (userId?: string) => [...dashboardKeys.all, 'summary', userId ?? 'anonymous'] as const,
};

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: dashboardKeys.summary(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_user_id: user?.id,
      });

      if (error) {
        throw error;
      }

      return normalizeDashboardSummary(data);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
