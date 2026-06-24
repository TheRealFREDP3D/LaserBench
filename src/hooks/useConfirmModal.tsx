import { useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

export function useConfirmModal() {
  const [state, setState] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false,
    message: '',
    onConfirm: () => {},
  });

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        message,
        onConfirm: () => {
          setState((prev) => ({ ...prev, open: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
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
