'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type FavoritesStore = {
  ids: string[];
  toggleFavorite: (_channelId: string) => void;
  hydrate: (_channelIds: string[]) => void;
  isFavorite: (_channelId: string) => boolean;
};

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggleFavorite: (channelId) =>
        set((state) => ({
          ids: state.ids.includes(channelId)
            ? state.ids.filter((id) => id !== channelId)
            : [...state.ids, channelId],
        })),
      hydrate: (ids) => set({ ids }),
      isFavorite: (channelId) => get().ids.includes(channelId),
    }),
    {
      name: 'iptvcloud:favorites',
    },
  ),
);

export function useFavoritesPersistence() {
  // No-op: persistence is now handled by zustand/middleware persist
}
