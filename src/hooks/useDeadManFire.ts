import { useCallback, useEffect, useRef } from 'react';
import { MachineProfile } from '../types';

const MAX_FIRE_MS = 60_000;

export function useDeadManFire(
  activeMachine: MachineProfile | null,
  onSend: (cmd: string) => Promise<void>,
  onLaserOff: () => Promise<void>
) {
  const fireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFire = useCallback(() => {
    if (fireTimerRef.current) {
      clearTimeout(fireTimerRef.current);
      fireTimerRef.current = null;
    }
    onLaserOff().catch(() => {});
  }, [onLaserOff]);

  const stopFireRef = useRef(stopFire);
  stopFireRef.current = stopFire;

  const fire = useCallback(() => {
    const power = Math.round((activeMachine?.pwmMax ?? 255) * 0.3);
    const cmd =
      activeMachine?.laserOn.replace('{power}', power.toString()) ?? `M3 S${power}`;
    Promise.resolve(onSend(cmd)).catch(() => {});
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
