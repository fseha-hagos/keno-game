import { create } from 'zustand';
import { UserDto } from '@keno/shared-types';
import { apiClient, getStoredToken, setStoredToken, removeStoredToken } from '../api/client';

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserDto, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (user, accessToken, refreshToken) => {
    setStoredToken('access_token', accessToken);
    setStoredToken('refresh_token', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
    try {
      const { socketService } = await import('../services/socket');
      socketService.authenticateUser(user.id);
    } catch {}
  },

  logout: async () => {
    removeStoredToken('access_token');
    removeStoredToken('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = getStoredToken('access_token');
      if (token) {
        const res = await apiClient.get('/api/v1/auth/me');
        set({ user: res.data, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      removeStoredToken('access_token');
      removeStoredToken('refresh_token');
    } finally {
      set({ isLoading: false });
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
