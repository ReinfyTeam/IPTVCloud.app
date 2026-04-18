'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

type SettingsStore = {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(_key: K, _value: UserSettings[K]) => void;
  resetSettings: () => void;
  hydrate: (_settings: Partial<UserSettings>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (_key, _value) =>
        set((state) => ({ settings: { ...state.settings, [_key]: _value } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      hydrate: (_settings) => set((state) => ({ settings: { ...state.settings, ..._settings } })),
    }),
    {
      name: 'iptvcloud:settings',
    },
  ),
);
