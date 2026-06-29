import { describe, it, expect } from 'vitest';
import { renderTextPath } from '../lib/vectorFont';

describe('vectorFont', () => {
  describe('renderTextPath', () => {
    it('returns strokes for known characters', () => {
      const strokes = renderTextPath('A', 0, 0, 4);
      expect(strokes.length).toBeGreaterThan(0);
      // Each stroke should be an array of [x,y] points
      for (const stroke of strokes) {
        expect(stroke.length).toBeGreaterThan(0);
        for (const point of stroke) {
          expect(point).toHaveLength(2);
          expect(typeof point[0]).toBe('number');
          expect(typeof point[1]).toBe('number');
        }
      }
    });

    it('renders multi-character text', () => {
      const singleChar = renderTextPath('A', 0, 0, 4);
      const multiChar = renderTextPath('AB', 0, 0, 4);
      expect(multiChar.length).toBeGreaterThanOrEqual(singleChar.length);
    });

    it('unknown characters fall back to space (empty strokes)', () => {
      const strokes = renderTextPath('!@#', 0, 0, 4);
      expect(strokes).toEqual([]);
    });

    it('empty string returns empty array', () => {
      const strokes = renderTextPath('', 0, 0, 4);
      expect(strokes).toEqual([]);
    });

    it('space character produces no strokes', () => {
      const strokes = renderTextPath(' ', 0, 0, 4);
      expect(strokes).toEqual([]);
    });

    it('scales with size parameter', () => {
      const small = renderTextPath('A', 0, 0, 2);
      const large = renderTextPath('A', 0, 0, 8);
      // Larger size should produce coordinates with larger values
      const maxSmall = Math.max(...small.flat(2));
      const maxLarge = Math.max(...large.flat(2));
      expect(maxLarge).toBeGreaterThan(maxSmall);
    });

    it('offsets with startX and startY', () => {
      const atOrigin = renderTextPath('A', 0, 0, 4);
      const offset = renderTextPath('A', 10, 20, 4);
      // All points in offset version should be shifted
      for (let i = 0; i < offset.length; i++) {
        for (let j = 0; j < offset[i].length; j++) {
          expect(offset[i][j][0]).toBeCloseTo(atOrigin[i][j][0] + 10, 5);
          expect(offset[i][j][1]).toBeCloseTo(atOrigin[i][j][1] + 20, 5);
        }
      }
    });

    it('handles lowercase input (converts to uppercase)', () => {
      const upper = renderTextPath('A', 0, 0, 4);
      const lower = renderTextPath('a', 0, 0, 4);
      expect(lower.length).toBe(upper.length);
    });

    it('digits render correctly', () => {
      for (const d of '0123456789') {
        const strokes = renderTextPath(d, 0, 0, 4);
        expect(strokes.length).toBeGreaterThan(0);
      }
    });
  });
});
