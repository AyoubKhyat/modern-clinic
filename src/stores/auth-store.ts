import { create } from 'zustand';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('clinic_token') : null;
    if (token) {
      set({ token, isAuthenticated: true });
      get().fetchUser();
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('clinic_token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('clinic_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await authApi.me();
      set({ user: data, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem('clinic_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
