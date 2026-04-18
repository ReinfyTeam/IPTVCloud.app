'use client';

import { useEffect } from 'react';

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
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isTyping) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          options.onTogglePlay?.();
          break;
        case 'm':
        case 'M':
          options.onToggleMute?.();
          break;
        case 'f':
        case 'F':
          options.onToggleFullscreen?.();
          break;
        case 'p':
        case 'P':
          options.onTogglePictureInPicture?.();
          break;
        case 's':
        case 'S':
          options.onScreenshot?.();
          break;
        case 'l':
        case 'L':
          options.onToggleLive?.();
          break;
        case 't':
        case 'T':
          options.onToggleTheater?.();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          options.onPreviousChannel?.();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          options.onNextChannel?.();
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options]);
}
