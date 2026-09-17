import { create } from 'zustand';
import { UserDto } from '@keno/shared-types';
import { apiClient, getSecureItem, setSecureItem, deleteSecureItem } from '../api/client';

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
    await setSecureItem('access_token', accessToken);
    await setSecureItem('refresh_token', refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await deleteSecureItem('access_token');
    await deleteSecureItem('refresh_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await getSecureItem('access_token');
      if (token) {
        const res = await apiClient.get('/api/v1/auth/me');
        set({ user: res.data, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // Not logged in or expired or API unreachable
    } finally {
      set({ isLoading: false });
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
