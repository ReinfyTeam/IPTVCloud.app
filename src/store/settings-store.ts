'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

type SettingsStore = {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
  hydrate: (settings: Partial<UserSettings>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      hydrate: (incoming) => set((state) => ({ settings: { ...state.settings, ...incoming } })),
    }),
    {
      name: 'iptvcloud:settings',
    },
  ),
);
