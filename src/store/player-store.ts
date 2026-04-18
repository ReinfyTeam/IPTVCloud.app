'use client';

import { create } from 'zustand';

type PlayerStore = {
  selectedChannelId: string | null;
  viewMode: 'grid' | 'list';
  setSelectedChannelId: (channelId: string | null) => void;
  setViewMode: (viewMode: 'grid' | 'list') => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  selectedChannelId: null,
  viewMode: 'grid',
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setViewMode: (viewMode) => set({ viewMode }),
}));
