import axios from 'axios';

// Base URL for the backend API
// Ensure you have VITE_API_BASE_URL in your .env file
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    // In a real application, you might want to get this from Redux state
    // but localStorage is safe for interceptors to avoid circular dependencies
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh or 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 Unauthorized and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token using a refresh token endpoint
        // const refreshToken = localStorage.getItem('refreshToken');
        // const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { token: refreshToken });
        // localStorage.setItem('accessToken', data.accessToken);
        // api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        // return api(originalRequest);

        // For now, if 401 occurs and no refresh token logic is fully implemented,
        // we can clear the session and force logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/signin';
        
      } catch (refreshError) {
        // Refresh token failed, force logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
