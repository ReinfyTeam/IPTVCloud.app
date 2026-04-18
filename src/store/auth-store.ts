'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

type AuthStore = {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isLoggedIn: () => boolean;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAdmin: () => get().user?.role === 'ADMIN',
      isStaff: () => get().user?.role === 'STAFF' || get().user?.role === 'ADMIN',
      isLoggedIn: () => Boolean(get().user),
    }),
    {
      name: 'iptvcloud:auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
