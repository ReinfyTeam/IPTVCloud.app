'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

type FavoritesStore = {
  ids: string[];
  toggleFavorite: (channelId: string) => void;
  hydrate: (channelIds: string[]) => void;
};

export const useFavoritesStore = create<FavoritesStore>((set) => ({
  ids: [],
  toggleFavorite: (channelId) =>
    set((state) => ({
      ids: state.ids.includes(channelId)
        ? state.ids.filter((id) => id !== channelId)
        : [...state.ids, channelId],
    })),
  hydrate: (ids) => set({ ids }),
}));

export function useFavoritesPersistence() {
  const ids = useFavoritesStore((state) => state.ids);
  const hydrate = useFavoritesStore((state) => state.hydrate);

  useEffect(() => {
    const stored = window.localStorage.getItem('iptvcloud:favorites');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as string[];
      hydrate(parsed);
    } catch {
      hydrate([]);
    }
  }, [hydrate]);

  useEffect(() => {
    window.localStorage.setItem('iptvcloud:favorites', JSON.stringify(ids));
  }, [ids]);
}
