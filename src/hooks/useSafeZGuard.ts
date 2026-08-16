import { useRef, useCallback } from 'react';
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
 *
 * IMPORTANT: this checks the *live* currentPos.z on every call. It does not
 * cache a one-time "already raised" flag — Z can be moved back down between
 * jogs (manual Z jog, a job, etc.), and every XY jog must be guarded against
 * whatever the head's real height is at that moment.
 */
export function useSafeZGuard(activeMachine: MachineProfile | null) {
  // Prevents two concurrent requireSafeZ() calls from both deciding to raise
  // Z at the same time (e.g. rapid double-jog). Not a "raised once" latch —
  // it only guards the raise that is currently in flight.
  const raiseInFlightRef = useRef<Promise<void> | null>(null);

  const requireSafeZ = useCallback(async (): Promise<void> => {
    if (!activeMachine) return;

    // If a raise is already underway, wait for it instead of starting a
    // second one; then re-check Z afterward via the normal call path.
    if (raiseInFlightRef.current !== null) {
      await raiseInFlightRef.current;
      // Re-check since the ref might have been cleared while we awaited
      if (raiseInFlightRef.current !== null) return;
    }

    const { currentPos, send, isConnected, movementMode } = useSerialStore.getState();

    // Nothing to do if not connected or Z is already at / above safe height.
    // This is re-evaluated from the live position every call — no cached flag.
    if (!isConnected) return;
    if (currentPos.z >= activeMachine.zSecure) return;

    const raise = (async () => {
      // Switch to absolute mode, raise Z, then restore the previous movement mode.
      await send('G90');
      // Re-read currentPos.z right before calculation to avoid stale closure
      const freshPos = useSerialStore.getState().currentPos;
      const zDistance = activeMachine.zSecure - freshPos.z;
      await send(
        `G0 Z${activeMachine.zSecure.toFixed(3)} F${activeMachine.travelSpeed || 4000}`
      );
      // Wait for the Z move to complete before allowing the jog to proceed.
      // Calculate estimated time based on distance and speed, add 50% buffer for acceleration.
      const travelSpeed = activeMachine.travelSpeed || 4000; // mm/min
      const estimatedSeconds = (zDistance / travelSpeed) * 60 * 1.5;
      const delayMs = Math.max(100, Math.min(estimatedSeconds * 1000, 5000)); // Clamp between 100ms and 5s
      await new Promise(resolve => setTimeout(resolve, delayMs));
      // Restore the previous movement mode (G90 or G91), with fallback to G90
      await send(movementMode || 'G90');
    })();

    raiseInFlightRef.current = raise;
    try {
      await raise;
    } catch (error) {
      // If any send fails, attempt to restore the movement mode to avoid
      // leaving the machine in an inconsistent state. Swallow errors from
      // the restoration attempt since the original error is more important.
      try {
        await send(movementMode || 'G90');
      } catch {
        // Ignore restoration error - original error will propagate
      }
      throw error;
    } finally {
      // Always clear, whether the raise succeeded or threw — a failed raise
      // must not permanently block future safety raises.
      if (raiseInFlightRef.current === raise) {
        raiseInFlightRef.current = null;
      }
    }
  }, [activeMachine]);

  // Kept for API compatibility with existing callers (e.g. after homing);
  // now a no-op since there is no cached "raised" flag to reset, but clearing
  // any stuck in-flight reference is still useful after a hard reset like home().
  const resetSafeZFlag = useCallback(() => {
    raiseInFlightRef.current = null;
  }, []);

  return { requireSafeZ, resetSafeZFlag };
}
