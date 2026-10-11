import axios from 'axios';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    // If running in development with default Vite port, target backend port 3000
    if (window.location.port === '5174' || window.location.port === '5173') {
      return `http://${window.location.hostname}:3000`;
    }
    // In production or custom WebView setup, use origin
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export function getStoredToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function removeStoredToken(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getStoredToken('refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          setStoredToken('access_token', accessToken);
          if (newRefreshToken) {
            setStoredToken('refresh_token', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        removeStoredToken('access_token');
        removeStoredToken('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);
