import { create } from 'zustand';
import { api, tokenStore } from '../lib/api';

type User = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  github_avatar?: string | null;
};

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    tokenStore.set(token);
    set({ user });
  },
  register: async (email, password) => {
    const { token, user } = await api.register(email, password);
    tokenStore.set(token);
    set({ user });
  },
  logout: () => {
    tokenStore.clear();
    set({ user: null });
  },
  bootstrap: async () => {
    if (!tokenStore.get()) {
      set({ ready: true });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, ready: true });
    } catch {
      tokenStore.clear();
      set({ user: null, ready: true });
    }
  },
}));
