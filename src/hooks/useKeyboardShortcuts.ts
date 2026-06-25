import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  onEStop?: () => void;
  onFire?: () => void;
  onStopFire?: () => void;
  onHome?: () => void;
  onJogUp?: () => void;
  onJogDown?: () => void;
  onJogLeft?: () => void;
  onJogRight?: () => void;
  onConnect?: () => void;
  onAbortPrint?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.ctrlKey && e.key === 'Escape') {
        e.preventDefault();
        handlers.onEStop?.();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onAbortPrint?.();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            handlers.onHome?.();
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            handlers.onFire?.();
          }
          break;
        case 'arrowup':
          e.preventDefault();
          handlers.onJogUp?.();
          break;
        case 'arrowdown':
          e.preventDefault();
          handlers.onJogDown?.();
          break;
        case 'arrowleft':
          e.preventDefault();
          handlers.onJogLeft?.();
          break;
        case 'arrowright':
          e.preventDefault();
          handlers.onJogRight?.();
          break;
        case 'c':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            handlers.onConnect?.();
          }
          break;
      }
    },
    [handlers]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        handlers.onStopFire?.();
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
