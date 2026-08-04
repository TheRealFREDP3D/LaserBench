import type { MachineProfile } from '../types';
import { useSerialStore } from '../store/useSerialStore';

export function clampToBed(
  machine: MachineProfile,
  x: number,
  y: number
): { x: number; y: number } {
  if (machine.bedShape === 'circular') {
    const r = machine.bedWidth / 2;
    const dist = Math.sqrt(x * x + y * y);
    if (dist > r) {
      return {
        x: (x / dist) * r,
        y: (y / dist) * r,
      };
    }
    return { x, y };
  }

  return {
    x: Math.max(0, Math.min(machine.bedWidth, x)),
    y: Math.max(0, Math.min(machine.bedHeight, y)),
  };
}

export function buildJogCommand(
  machine: MachineProfile,
  targetX: number,
  targetY: number
): string {
  const nx = Math.round(targetX * 100) / 100;
  const ny = Math.round(targetY * 100) / 100;
  const feed = machine.travelSpeed || 4000;
  return `G0 X${nx.toFixed(2)} Y${ny.toFixed(2)} F${feed}`;
}

// always uses fresh currentPos from store
export function getFreshCurrentPos() {
  return useSerialStore.getState().currentPos;
}
