import { useCallback, useEffect, useRef } from 'react';
import { sanitizeGCodeLine } from '../lib/gcodeGenerator';
import { MachineProfile } from '../types';

const MAX_FIRE_MS = 60_000;

export function useDeadManFire(
  activeMachine: MachineProfile | null,
  onSend: (cmd: string) => Promise<void>
) {
  const fireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laserOffCmd =
    (activeMachine && sanitizeGCodeLine(activeMachine.laserOff)) || 'M5';

  const stopFire = useCallback(() => {
    if (fireTimerRef.current) {
      clearTimeout(fireTimerRef.current);
      fireTimerRef.current = null;
    }
    onSend(laserOffCmd).catch(() => {});
  }, [onSend, laserOffCmd]);

  const stopFireRef = useRef(stopFire);
  stopFireRef.current = stopFire;

  const fire = useCallback(() => {
    const power = Math.round((activeMachine?.pwmMax ?? 255) * 0.3);
    const cmd =
      activeMachine?.laserOn.replace('{power}', power.toString()) ?? `M3 S${power}`;
    onSend(cmd).catch(() => {});
    if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
    fireTimerRef.current = setTimeout(() => {
      fireTimerRef.current = null;
      stopFireRef.current();
    }, MAX_FIRE_MS);
  }, [activeMachine, onSend]);

  useEffect(
    () => () => {
      if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
    },
    []
  );

  return { fire, stopFire };
}
