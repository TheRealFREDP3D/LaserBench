import { useEffect, useCallback, useRef } from 'react';

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

export function useKeyboardShortcuts({
  onEStop,
  onFire,
  onStopFire,
  onHome,
  onJogUp,
  onJogDown,
  onJogLeft,
  onJogRight,
  onConnect,
  onAbortPrint,
}: KeyboardShortcutHandlers) {
  const fireActiveRef = useRef(false);

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
        onEStop?.();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onAbortPrint?.();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            onHome?.();
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            fireActiveRef.current = true;
            onFire?.();
          }
          break;
        case 'arrowup':
          e.preventDefault();
          onJogUp?.();
          break;
        case 'arrowdown':
          e.preventDefault();
          onJogDown?.();
          break;
        case 'arrowleft':
          e.preventDefault();
          onJogLeft?.();
          break;
        case 'arrowright':
          e.preventDefault();
          onJogRight?.();
          break;
        case 'c':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            onConnect?.();
          }
          break;
      }
    },
    [onEStop, onAbortPrint, onHome, onFire, onJogUp, onJogDown, onJogLeft, onJogRight, onConnect]
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

      if (e.key.toLowerCase() === 'f' && fireActiveRef.current) {
        fireActiveRef.current = false;
        onStopFire?.();
      }
    },
    [onStopFire]
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
