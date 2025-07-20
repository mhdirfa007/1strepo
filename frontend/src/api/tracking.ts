import { api } from './client';
import { TrackingEntry, TrackingResponse, CalendarResponse, TrackingForm } from '../types';

export const trackingAPI = {
  // Get tracking entries
  getTrackingEntries: async (params?: {
    habitId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<TrackingResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.habitId) queryParams.append('habitId', params.habitId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return api.get<TrackingResponse>(`/tracking${query ? `?${query}` : ''}`);
  },

  // Get calendar view data
  getCalendarData: async (year: number, month: number): Promise<CalendarResponse> => {
    return api.get<CalendarResponse>(`/tracking/calendar?year=${year}&month=${month}`);
  },

  // Create or update tracking entry
  trackHabit: async (habitId: string, date: string, data: TrackingForm): Promise<{ entry: TrackingEntry }> => {
    return api.post<{ entry: TrackingEntry }>('/tracking', {
      habitId,
      date,
      ...data,
    });
  },

  // Update a specific tracking entry
  updateTrackingEntry: async (entryId: string, data: Partial<TrackingForm>): Promise<{ entry: TrackingEntry }> => {
    return api.put<{ entry: TrackingEntry }>(`/tracking/${entryId}`, data);
  },

  // Delete a tracking entry
  deleteTrackingEntry: async (entryId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/tracking/${entryId}`);
  },

  // Get tracking history for a specific habit
  getHabitTrackingHistory: async (habitId: string, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    habit: any;
    entries: TrackingEntry[];
    currentStreak: number;
    analytics: any;
    total: number;
  }> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return api.get(`/tracking/habit/${habitId}${query ? `?${query}` : ''}`);
  },

  // Get current streak for a habit
  getHabitStreak: async (habitId: string): Promise<{ habitId: string; currentStreak: number }> => {
    return api.get<{ habitId: string; currentStreak: number }>(`/tracking/streak/${habitId}`);
  },
};