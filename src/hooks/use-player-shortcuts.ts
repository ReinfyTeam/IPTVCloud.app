'use client';

import { useEffect } from 'react';
import { useShortcutStore } from '@/store/shortcut-store';

type Options = {
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onTogglePlay?: () => void;
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
  onTogglePictureInPicture?: () => void;
  onScreenshot?: () => void;
  onToggleLive?: () => void;
  onToggleTheater?: () => void;
  onSleepTimer?: () => void;
};

export function usePlayerShortcuts(options: Options) {
  const { shortcuts } = useShortcutStore();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isTyping) return;

      const key = event.key.toLowerCase();
      const getActionKey = (action: string) => shortcuts.find(s => s.action === action)?.key.toLowerCase();

      if (key === getActionKey('toggle_play')) {
        event.preventDefault();
        options.onTogglePlay?.();
      } else if (key === getActionKey('toggle_mute')) {
        options.onToggleMute?.();
      } else if (key === getActionKey('toggle_fullscreen')) {
        options.onToggleFullscreen?.();
      } else if (key === getActionKey('next_channel')) {
        event.preventDefault();
        options.onNextChannel?.();
      } else if (key === getActionKey('prev_channel')) {
        event.preventDefault();
        options.onPreviousChannel?.();
      } else if (key === getActionKey('screenshot')) {
        options.onScreenshot?.();
      } else if (key === getActionKey('theater_mode')) {
        options.onToggleTheater?.();
      } else if (key === 'p') {
        options.onTogglePictureInPicture?.();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, shortcuts]);
}
