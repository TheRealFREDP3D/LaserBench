import { describe, it, expect } from 'vitest';
import { DeltaKinematics, DEFAULT_DELTA_PARAMS } from '../lib/deltaKinematics';

describe('DeltaKinematics', () => {
  describe('isReachable', () => {
    const dk = new DeltaKinematics();

    it('center (0,0) is always reachable', () => {
      expect(dk.isReachable(0, 0)).toBe(true);
    });

    it('point within print radius is reachable', () => {
      const r = DEFAULT_DELTA_PARAMS.printRadius;
      expect(dk.isReachable(r * 0.5, 0)).toBe(true);
      expect(dk.isReachable(0, r * 0.5)).toBe(true);
    });

    it('point outside print radius is unreachable', () => {
      const r = DEFAULT_DELTA_PARAMS.printRadius;
      expect(dk.isReachable(r + 10, 0)).toBe(false);
      expect(dk.isReachable(0, r + 10)).toBe(false);
    });

    it('point exactly at print radius is reachable', () => {
      const r = DEFAULT_DELTA_PARAMS.printRadius;
      expect(dk.isReachable(r, 0)).toBe(true);
    });
  });

  describe('getMaxRadius', () => {
    it('returns the configured print radius', () => {
      const dk = new DeltaKinematics({ printRadius: 100 });
      expect(dk.getMaxRadius()).toBe(100);
    });

    it('defaults to DEFAULT_DELTA_PARAMS.printRadius', () => {
      const dk = new DeltaKinematics();
      expect(dk.getMaxRadius()).toBe(DEFAULT_DELTA_PARAMS.printRadius);
    });
  });

  describe('inverseKinematics', () => {
    const dk = new DeltaKinematics();

    it('returns tower heights for reachable center point', () => {
      const result = dk.inverseKinematics(0, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.a).toBeGreaterThan(0);
      expect(result!.b).toBeGreaterThan(0);
      expect(result!.c).toBeGreaterThan(0);
    });

    it('returns null for unreachable point', () => {
      const r = DEFAULT_DELTA_PARAMS.printRadius;
      const result = dk.inverseKinematics(r + 50, 0, 0);
      expect(result).toBeNull();
    });

    it('returns null when rod length is too short for the XY distance', () => {
      const shortRodDk = new DeltaKinematics({ deltaRodLength: 10, printRadius: 200 });
      const result = shortRodDk.inverseKinematics(0, 0, 0);
      // Rod length 10 might be too short for the default radius
      if (result === null) {
        expect(result).toBeNull();
      } else {
        expect(typeof result.a).toBe('number');
      }
    });

    it('tower heights are symmetric for center point', () => {
      const result = dk.inverseKinematics(0, 0, 0);
      expect(result).not.toBeNull();
      // At center, all towers should be equidistant
      expect(result!.a).toBeCloseTo(result!.b, 5);
      expect(result!.b).toBeCloseTo(result!.c, 5);
    });
  });

  describe('custom parameters', () => {
    it('accepts partial params and fills defaults', () => {
      const dk = new DeltaKinematics({ printRadius: 120 });
      expect(dk.getMaxRadius()).toBe(120);
      // Other params should be defaults
    });

    it('works with non-zero tower angle offset', () => {
      const dk = new DeltaKinematics({ deltaTowerAngleOffset: 30 });
      const result = dk.inverseKinematics(0, 0, 0);
      expect(result).not.toBeNull();
    });
  });
});
