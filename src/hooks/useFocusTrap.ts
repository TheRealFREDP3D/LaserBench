import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const prevFocusStack: (HTMLElement | null)[] = [];

export function useFocusTrap<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save current focus only if no other trap already saved one
    if (prevFocusStack.length === 0) {
      savedFocusRef.current = document.activeElement as HTMLElement;
    }
    prevFocusStack.push(savedFocusRef.current);

    const el = ref.current;
    if (!el) return;

    // Focus the first focusable element inside the modal
    const timer = setTimeout(() => {
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // No focusable children — focus the container itself to keep Tab trapped
        el.setAttribute('tabindex', '-1');
        el.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) {
        // No focusable children — prevent Tab from escaping
        e.preventDefault();
        return;
      }

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
      prevFocusStack.pop();
      // Restore focus only when the outermost trap closes
      if (prevFocusStack.length === 0) {
        savedFocusRef.current?.focus();
        savedFocusRef.current = null;
      }
    };
  }, [active]);

  return ref;
}
