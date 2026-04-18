'use client';

import { create } from 'zustand';

type PlayerStore = {
  selectedChannelId: string | null;
  lastChannelId: string | null;
  viewMode: 'grid' | 'list';
  setSelectedChannelId: (_channelId: string | null) => void;
  setLastChannelId: (_channelId: string | null) => void;
  setViewMode: (_viewMode: 'grid' | 'list') => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  selectedChannelId: null,
  lastChannelId: null,
  viewMode: 'grid',
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setLastChannelId: (lastChannelId) => set({ lastChannelId }),
  setViewMode: (viewMode) => set({ viewMode }),
}));
