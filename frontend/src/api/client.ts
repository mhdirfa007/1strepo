import axios, { AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      status: error.response?.status,
    };

    if (error.response?.data) {
      const errorData = error.response.data as any;
      apiError.message = errorData.message || errorData.error || apiError.message;
      apiError.code = errorData.code;
    } else if (error.request) {
      apiError.message = 'Network error - please check your connection';
    }

    // Handle 401 errors by clearing auth data
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(apiError);
  }
);

// Generic API request helper
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any
): Promise<T> => {
  try {
    const response = await apiClient({
      method,
      url,
      data,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Specific API methods
export const api = {
  // GET request
  get: <T>(url: string): Promise<T> => apiRequest<T>('GET', url),
  
  // POST request
  post: <T>(url: string, data?: any): Promise<T> => apiRequest<T>('POST', url, data),
  
  // PUT request
  put: <T>(url: string, data?: any): Promise<T> => apiRequest<T>('PUT', url, data),
  
  // DELETE request
  delete: <T>(url: string): Promise<T> => apiRequest<T>('DELETE', url),
};

export default apiClient;