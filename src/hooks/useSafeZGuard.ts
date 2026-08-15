import { useRef, useCallback, useEffect } from 'react';
import { MachineProfile } from '../types';
import { useSerialStore } from '../store/useSerialStore';

/**
 * Before any XY jog, ensure the laser head is at or above the machine's safe Z
 * height. If the current Z is below zSecure, the guard automatically raises Z
 * first — no user confirmation required, this is an unconditional safety action.
 *
 * Returns a `requireSafeZ` function to be called at the top of every jog handler.
 * Resolves immediately if Z is already safe; otherwise sends G90 + G0 Z<zSecure>
 * and resolves after the command is queued.
 */
export function useSafeZGuard(activeMachine: MachineProfile | null) {
  const raisedRef = useRef(false);

  // Reset the "already raised" flag whenever the machine changes, so a fresh
  // machine selection always re-evaluates.
  const lastMachineId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeMachine?.id !== lastMachineId.current) {
      lastMachineId.current = activeMachine?.id;
      raisedRef.current = false;
    }
  }, [activeMachine?.id]);

  const requireSafeZ = useCallback(async (): Promise<void> => {
    if (!activeMachine) return;

    const { currentPos, send, isConnected, movementMode } = useSerialStore.getState();

    // Nothing to do if not connected or Z is already at / above safe height.
    if (!isConnected) return;
    if (currentPos.z >= activeMachine.zSecure) return;
    // Already raised this session — don't re-raise on every single jog step.
    if (raisedRef.current) return;

    raisedRef.current = true;

    // Switch to absolute mode, raise Z, then restore the previous movement mode.
    await send('G90');
    await send(
      `G0 Z${activeMachine.zSecure.toFixed(3)} F${activeMachine.travelSpeed || 4000}`
    );
    // Restore the previous movement mode (G90 or G91)
    await send(movementMode);
  }, [activeMachine]);

  // Expose a reset so callers can force re-evaluation after disconnect / home.
  const resetSafeZFlag = useCallback(() => {
    raisedRef.current = false;
  }, []);

  return { requireSafeZ, resetSafeZFlag };
}
