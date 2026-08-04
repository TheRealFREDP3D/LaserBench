import { useRef, useCallback } from 'react';
import { useConfirmModal, ConfirmSupersededError } from './useConfirmModal';
import { useSerialStore } from '../store/useSerialStore';

export function useUnhomedJogGuard() {
  const { isHomed } = useSerialStore();
  const { confirm } = useConfirmModal();
  const overrideRef = useRef(false);

  const requireHomingConfirm = useCallback(async (): Promise<boolean> => {
    if (isHomed || overrideRef.current) return true;
    let accepted = false;
    try {
      accepted = await confirm(
        'The machine has not been homed — its coordinates are unknown. Tech demo mode: jogging anyway may drive an axis into the hard stops. Jog without homing?'
      );
    } catch (e) {
      if (!(e instanceof ConfirmSupersededError)) throw e;
    }
    if (!accepted) return false;
    overrideRef.current = true;
    return true;
  }, [isHomed, confirm]);

  const onHome = useCallback(() => {
    overrideRef.current = false;
  }, []);

  return { requireHomingConfirm, onHome };
}
