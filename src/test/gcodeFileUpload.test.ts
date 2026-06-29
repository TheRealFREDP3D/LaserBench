import { describe, it, expect } from 'vitest';
import { parseGCodeFile, readGCodeFile } from '../lib/gcodeFileUpload';

const SAMPLE_GCODE = `G90
G0 X10 Y10
M3 S100
G1 X50 Y50 F1000
M5
G0 X0 Y0`;

describe('gcodeFileUpload', () => {
  describe('parseGCodeFile', () => {
    it('parses gcode and returns GeneratedData structure', () => {
      const result = parseGCodeFile(SAMPLE_GCODE);
      expect(result.gcode).toBe(SAMPLE_GCODE);
      expect(result.svgPaths).toBeDefined();
      expect(result.paths).toBeDefined();
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
      expect(typeof result.offsetX).toBe('number');
      expect(typeof result.offsetY).toBe('number');
    });

    it('computes width and height from bounds', () => {
      const result = parseGCodeFile(SAMPLE_GCODE);
      expect(result.width).toBeGreaterThanOrEqual(0);
      expect(result.height).toBeGreaterThanOrEqual(0);
    });

    it('handles empty gcode gracefully', () => {
      const result = parseGCodeFile('');
      expect(result.gcode).toBe('');
      expect(result.svgPaths).toEqual([]);
      expect(result.paths).toEqual([]);
    });

    it('defaults pwmMax to 1000', () => {
      const result = parseGCodeFile(SAMPLE_GCODE);
      expect(result).toHaveProperty('gcode');
      expect(result).toHaveProperty('svgPaths');
    });

    it('respects custom pwmMax', () => {
      const result = parseGCodeFile(SAMPLE_GCODE, 500);
      expect(result).toHaveProperty('gcode');
    });
  });

  describe('readGCodeFile', () => {
    it('reads a file and returns its content', async () => {
      const content = 'G0 X0 Y0\nM3 S100';
      const file = new File([content], 'test.gcode', { type: 'text/plain' });
      const result = await readGCodeFile(file);
      expect(result).toBe(content);
    });

    it('reads an empty file', async () => {
      const file = new File([''], 'empty.gcode', { type: 'text/plain' });
      const result = await readGCodeFile(file);
      expect(result).toBe('');
    });
  });
});
