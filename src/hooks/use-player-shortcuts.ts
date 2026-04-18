'use client';

import { useEffect } from 'react';

type Options = {
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onTogglePlay?: () => void;
  onPreviousChannel?: () => void;
  onNextChannel?: () => void;
  onTogglePictureInPicture?: () => void;
};

export function usePlayerShortcuts(options: Options) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isTypingTarget) return;

      const key = event.key.toLowerCase();

      if (key === ' ' || event.code === 'Space') {
        event.preventDefault();
        options.onTogglePlay?.();
      }

      if (key === 'm') {
        options.onToggleMute?.();
      }

      if (key === 'f') {
        options.onToggleFullscreen?.();
      }

      if (key === 'p') {
        options.onTogglePictureInPicture?.();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        options.onPreviousChannel?.();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        options.onNextChannel?.();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options]);
}
