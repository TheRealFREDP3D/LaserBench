import { describe, it, expect } from 'vitest';
import { estimateToolpathTime, formatEstimatedTime } from '../lib/timeEstimator';
import type { MachineProfile } from '../types';

const MACHINE: MachineProfile = {
  id: 'test',
  name: 'Test',
  firmware: 'grbl',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  safeZ: 5,
  workZ: 0,
  travelSpeed: 4000,
  bedShape: 'rectangular',
  bedWidth: 300,
  bedHeight: 300,
  originX: 0,
  originY: 0,
  acceleration: 1000,
  isDelta: false,
};

describe('estimateToolpathTime', () => {
  it('returns 0 for empty paths', () => {
    expect(estimateToolpathTime([], MACHINE)).toBe(0);
  });

  it('returns 0 for null/undefined paths', () => {
    expect(estimateToolpathTime(null as any, MACHINE)).toBe(0);
    expect(estimateToolpathTime(undefined as any, MACHINE)).toBe(0);
  });

  it('returns 0 for paths with fewer than 2 points', () => {
    const paths = [{ points: [[0, 0] as [number, number]], speed: 1000, isLaserOn: true }];
    expect(estimateToolpathTime(paths, MACHINE)).toBe(0);
  });

  it('estimates time for a single laser-on segment', () => {
    const paths = [{
      points: [[0, 0] as [number, number], [100, 0] as [number, number]],
      speed: 1000,
      isLaserOn: true,
    }];
    const time = estimateToolpathTime(paths, MACHINE);
    expect(time).toBeGreaterThan(0);
  });

  it('uses travel speed for laser-off segments', () => {
    const laserPath = [{
      points: [[0, 0] as [number, number], [100, 0] as [number, number]],
      speed: 1000,
      isLaserOn: true,
    }];
    const travelPath = [{
      points: [[0, 0] as [number, number], [100, 0] as [number, number]],
      speed: 1000,
      isLaserOn: false,
    }];
    // Travel should use machine.travelSpeed (4000), which is faster → less time
    const laserTime = estimateToolpathTime(laserPath, MACHINE);
    const travelTime = estimateToolpathTime(travelPath, MACHINE);
    expect(travelTime).toBeLessThan(laserTime);
  });

  it('handles zero acceleration gracefully (uses minimum)', () => {
    const machineZeroAccel = { ...MACHINE, acceleration: 0 };
    const paths = [{
      points: [[0, 0] as [number, number], [50, 0] as [number, number]],
      speed: 1000,
      isLaserOn: true,
    }];
    // Should not throw
    const time = estimateToolpathTime(paths, machineZeroAccel);
    expect(time).toBeGreaterThan(0);
  });

  it('handles single-point path segments (skips them)', () => {
    const paths = [{
      points: [[5, 5] as [number, number]],
      speed: 1000,
      isLaserOn: true,
    }];
    expect(estimateToolpathTime(paths, MACHINE)).toBe(0);
  });
});

describe('formatEstimatedTime', () => {
  it('returns "0s" for zero or negative', () => {
    expect(formatEstimatedTime(0)).toBe('0s');
    expect(formatEstimatedTime(-10)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatEstimatedTime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatEstimatedTime(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatEstimatedTime(3661)).toBe('1h 1m 1s');
  });

  it('formats exact minutes', () => {
    expect(formatEstimatedTime(120)).toBe('2m');
  });
});
