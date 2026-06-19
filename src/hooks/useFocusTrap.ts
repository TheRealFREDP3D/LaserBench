import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const prevRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Remember who had focus before the modal opened
    prevRef.current = document.activeElement as HTMLElement;

    const el = ref.current;
    if (!el) return;

    // Focus the first focusable element inside the modal
    const timer = setTimeout(() => {
      const first = el.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the modal opened
      prevRef.current?.focus();
    };
  }, [active]);

  return ref;
}
