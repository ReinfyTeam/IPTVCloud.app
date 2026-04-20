'use client';

import React, { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { ACCENT_COLORS } from '@/types';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;

    // Theme Mode
    if (settings.darkMode) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Accent Color
    let accentHex = settings.accentColor;
    if (!accentHex.startsWith('#')) {
      const preset = ACCENT_COLORS.find((c) => c.id === settings.accentColor);
      accentHex = preset ? preset.hex : ACCENT_COLORS[0].hex;
    }

    root.style.setProperty('--accent', accentHex);

    // Hex to RGB for glow effect (opacity support)
    try {
      const hex = accentHex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        root.style.setProperty(
          '--accent-glow',
          `rgba(${r}, ${g}, ${b}, ${settings.darkMode ? '0.15' : '0.1'})`,
        );
      }
    } catch (e) {
      console.error('Error parsing accent color:', e);
    }
  }, [settings.accentColor, settings.darkMode]);

  return <>{children}</>;
}
