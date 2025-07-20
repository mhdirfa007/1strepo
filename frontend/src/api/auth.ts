import { api } from './client';
import { User, AuthResponse, LoginForm, RegisterForm } from '../types';

export const authAPI = {
  // Register new user
  register: async (data: RegisterForm): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
    });
    return response;
  },

  // Login user
  login: async (data: LoginForm): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response;
  },

  // Get current user profile
  getProfile: async (): Promise<{ user: User }> => {
    return api.get<{ user: User }>('/auth/me');
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<{ user: User }> => {
    return api.put<{ user: User }>('/auth/profile', data);
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  // Verify JWT token
  verifyToken: async (): Promise<{ valid: boolean; user: User }> => {
    return api.post<{ valid: boolean; user: User }>('/auth/verify-token');
  },

  // Logout (client-side only - remove token)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};