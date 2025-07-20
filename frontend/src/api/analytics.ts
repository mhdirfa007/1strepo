import { api } from './client';
import { OverviewAnalytics, Analytics, HeatmapData, TrendData, Habit } from '../types';

export const analyticsAPI = {
  // Get overview analytics for user
  getOverviewAnalytics: async (days = 30): Promise<{ overview: OverviewAnalytics }> => {
    return api.get<{ overview: OverviewAnalytics }>(`/analytics/overview?days=${days}`);
  },

  // Get detailed analytics for a specific habit
  getHabitAnalytics: async (habitId: string, days = 30): Promise<{
    habit: Habit;
    analytics: Analytics;
  }> => {
    return api.get(`/analytics/habit/${habitId}?days=${days}`);
  },

  // Get heatmap data for all habits
  getHeatmapData: async (year?: number): Promise<{
    heatmapData: HeatmapData;
    habits: Array<{ id: string; name: string; color: string; category: string }>;
    year: number;
  }> => {
    const params = year ? `?year=${year}` : '';
    return api.get(`/analytics/heatmap${params}`);
  },

  // Get trend analysis for habits
  getTrendsData: async (params?: {
    period?: 'week' | 'month' | 'quarter' | 'year';
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    trends: TrendData[];
    period: string;
    groupBy: string;
    habits: Array<{ id: string; name: string; category: string; color: string }>;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    
    const query = queryParams.toString();
    return api.get(`/analytics/trends${query ? `?${query}` : ''}`);
  },
};