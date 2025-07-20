import { api } from './client';
import { Habit, HabitsResponse, HabitForm, HabitWithAnalytics } from '../types';

export const habitsAPI = {
  // Get all habits for the user
  getHabits: async (includeTracking = false): Promise<HabitsResponse> => {
    const params = includeTracking ? '?include_tracking=true' : '';
    return api.get<HabitsResponse>(`/habits${params}`);
  },

  // Get a specific habit with details
  getHabit: async (habitId: string): Promise<HabitWithAnalytics> => {
    return api.get<HabitWithAnalytics>(`/habits/${habitId}`);
  },

  // Create a new habit
  createHabit: async (habitData: Partial<HabitForm>): Promise<{ habit: Habit }> => {
    return api.post<{ habit: Habit }>('/habits', habitData);
  },

  // Update an existing habit
  updateHabit: async (habitId: string, habitData: Partial<HabitForm>): Promise<{ habit: Habit }> => {
    return api.put<{ habit: Habit }>(`/habits/${habitId}`, habitData);
  },

  // Delete a habit (soft delete)
  deleteHabit: async (habitId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/habits/${habitId}`);
  },

  // Reorder habits
  reorderHabits: async (habitOrders: { habitId: string; order: number }[]): Promise<{ habits: Habit[] }> => {
    return api.put<{ habits: Habit[] }>('/habits/reorder', { habitOrders });
  },
};