'use client';

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { ACCENT_COLORS } from '@/types';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const color = ACCENT_COLORS.find((c) => c.id === settings.accentColor) || ACCENT_COLORS[0];

    root.style.setProperty('--accent', color.hex);

    // Hex to RGB for glow effect (opacity support)
    const r = parseInt(color.hex.slice(1, 3), 16);
    const g = parseInt(color.hex.slice(3, 5), 16);
    const b = parseInt(color.hex.slice(5, 7), 16);
    root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.15)`);
  }, [settings.accentColor]);

  return <>{children}</>;
}
