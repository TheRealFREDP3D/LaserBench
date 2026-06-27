import { useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export class ConfirmSupersededError extends Error {
  constructor() {
    super('Confirm dialog was superseded by a new one');
    this.name = 'ConfirmSupersededError';
  }
}

export function useConfirmModal() {
  const [state, setState] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false,
    message: '',
    onConfirm: () => {},
  });

  const pendingRef = useRef<{
    resolve: (value: boolean) => void;
    reject: (reason?: unknown) => void;
  } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      if (pendingRef.current) {
        pendingRef.current.reject(new ConfirmSupersededError());
        pendingRef.current = null;
      }
      pendingRef.current = { resolve, reject };
      setState({
        open: true,
        message,
        onConfirm: () => {
          setState((prev) => ({ ...prev, open: false }));
          pendingRef.current?.resolve(true);
          pendingRef.current = null;
        },
      });
    });
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
    pendingRef.current?.resolve(false);
    pendingRef.current = null;
  }, []);

  const ConfirmModalComponent = (
    <ConfirmModal
      open={state.open}
      message={state.message}
      onConfirm={state.onConfirm}
      onCancel={cancel}
    />
  );

  return { confirm, ConfirmModalComponent };
}
