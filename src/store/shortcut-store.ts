'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ShortcutAction =
  | 'toggle_play'
  | 'toggle_mute'
  | 'toggle_fullscreen'
  | 'next_channel'
  | 'prev_channel'
  | 'screenshot'
  | 'theater_mode';

export type CustomShortcut = {
  action: ShortcutAction;
  key: string;
};

type ShortcutStore = {
  shortcuts: CustomShortcut[];
  setShortcut: (action: ShortcutAction, key: string) => void;
  getShortcutKey: (action: ShortcutAction) => string;
  loadShortcuts: (shortcuts: CustomShortcut[]) => void;
};

const DEFAULT_SHORTCUTS: CustomShortcut[] = [
  { action: 'toggle_play', key: ' ' },
  { action: 'toggle_mute', key: 'm' },
  { action: 'toggle_fullscreen', key: 'f' },
  { action: 'next_channel', key: 'ArrowRight' },
  { action: 'prev_channel', key: 'ArrowLeft' },
  { action: 'screenshot', key: 's' },
  { action: 'theater_mode', key: 't' },
];

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,
      setShortcut: (action, key) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((s) => (s.action === action ? { ...s, key } : s)),
        })),
      getShortcutKey: (action) => {
        const s = get().shortcuts.find((s) => s.action === action);
        return s ? s.key : DEFAULT_SHORTCUTS.find((ds) => ds.action === action)?.key || '';
      },
      loadShortcuts: (incoming) =>
        set({
          shortcuts: [
            ...DEFAULT_SHORTCUTS.map((ds) => {
              const found = incoming.find((i) => i.action === ds.action);
              return found ? found : ds;
            }),
          ],
        }),
    }),
    {
      name: 'iptvcloud:shortcuts',
    },
  ),
);
