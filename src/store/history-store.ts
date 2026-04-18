'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Channel } from '@/types';

export type HistoryEntry = {
  channelId: string;
  channelName: string;
  channelLogo?: string;
  watchedAt: number;
};

type HistoryStore = {
  history: HistoryEntry[];
  addEntry: (channel: Channel) => void;
  removeEntry: (channelId: string) => void;
  clearHistory: () => void;
};

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      history: [],
      addEntry: (channel) =>
        set((state) => {
          const filtered = state.history.filter((e) => e.channelId !== channel.id);
          const entry: HistoryEntry = {
            channelId: channel.id,
            channelName: channel.name,
            channelLogo: channel.logo,
            watchedAt: Date.now(),
          };
          return { history: [entry, ...filtered].slice(0, MAX_HISTORY) };
        }),
      removeEntry: (channelId) =>
        set((state) => ({ history: state.history.filter((e) => e.channelId !== channelId) })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'iptvcloud:history',
    },
  ),
);
