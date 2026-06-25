import { describe, it, expect } from 'vitest';
import { parseGCode } from '../lib/gcodeParser';

describe('gcodeParser', () => {
  describe('basic G-code parsing', () => {
    it('parses simple G1 moves', () => {
      const gcode = `G90
G0 X0 Y0
M3 S500
G1 X10 Y0 F1000
G1 X10 Y10
M5`;
      const result = parseGCode(gcode);
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.paths[0].points.length).toBeGreaterThanOrEqual(2);
    });

    it('extracts power from M3 S command', () => {
      const gcode = `G0 X0 Y0
M3 S750
G1 X10 Y0 F1000
G1 X20 Y0
M5`;
      const result = parseGCode(gcode);
      const laserPath = result.paths.find((p) => p.isLaserOn);
      expect(laserPath).toBeDefined();
      expect(laserPath!.power).toBe(750);
    });

    it('extracts speed from F command', () => {
      const gcode = `G0 X0 Y0
M3 S500
G1 F1500 X10 Y0
G1 X20 Y0
M5`;
      const result = parseGCode(gcode);
      const laserPath = result.paths.find((p) => p.isLaserOn);
      expect(laserPath!.speed).toBe(1500);
    });

    it('tracks laser on/off state', () => {
      const gcode = `G0 X0 Y0
M3 S500
G1 X10 Y0 F1000
M5
G0 X20 Y20
M3 S300
G1 X30 Y20 F1000
M5`;
      const result = parseGCode(gcode);
      const laserPaths = result.paths.filter((p) => p.isLaserOn);
      expect(laserPaths.length).toBe(2);
      expect(laserPaths[0].power).toBe(500);
      expect(laserPaths[1].power).toBe(300);
    });
  });

  describe('G90 absolute mode', () => {
    it('interprets coordinates as absolute positions', () => {
      const gcode = `G90
G0 X0 Y0
G1 X10 Y0 F1000
G1 X20 Y5
M5`;
      const result = parseGCode(gcode);
      const allPoints = result.paths.flatMap((p) => p.points);
      expect(allPoints).toContainEqual([20, 5]);
    });
  });

  describe('G91 incremental mode', () => {
    it('interprets coordinates as deltas', () => {
      const gcode = `G91
G0 X0 Y0
G1 X10 Y0 F1000
G1 X10 Y5
M5`;
      const result = parseGCode(gcode);
      const allPoints = result.paths.flatMap((p) => p.points);
      expect(allPoints).toContainEqual([20, 5]);
    });

    it('handles G91 then G90 switch', () => {
      const gcode = `G91
G0 X0 Y0
G1 X10 Y0 F1000
G90
G1 X5 Y5
M5`;
      const result = parseGCode(gcode);
      const allPoints = result.paths.flatMap((p) => p.points);
      expect(allPoints).toContainEqual([5, 5]);
    });
  });

  describe('G28 home command', () => {
    it('resets position to 0,0', () => {
      const gcode = `G0 X50 Y50
G28
G1 X10 Y10 F1000
M5`;
      const result = parseGCode(gcode);
      const allPoints = result.paths.flatMap((p) => p.points);
      expect(allPoints).toContainEqual([0, 0]);
    });
  });

  describe('G92 set position', () => {
    it('sets current position without moving', () => {
      const gcode = `G92 X100 Y100
G1 X110 Y110 F1000
M5`;
      const result = parseGCode(gcode);
      const allPoints = result.paths.flatMap((p) => p.points);
      expect(allPoints).toContainEqual([110, 110]);
    });
  });

  describe('M106/M107 fan mode', () => {
    it('parses M106 as laser on', () => {
      const gcode = `G0 X0 Y0
M106 S200
G1 X10 Y0 F1000
M107`;
      const result = parseGCode(gcode);
      const laserPath = result.paths.find((p) => p.isLaserOn);
      expect(laserPath).toBeDefined();
      expect(laserPath!.power).toBe(200);
    });
  });

  describe('SVG output', () => {
    it('generates SVG paths matching parsed paths', () => {
      const gcode = `G0 X0 Y0
M3 S500
G1 X10 Y0 F1000
G1 X10 Y10
M5`;
      const result = parseGCode(gcode);
      expect(result.svgPaths.length).toBe(result.paths.length);
      for (const svg of result.svgPaths) {
        expect(svg.d).toContain('M');
        expect(svg.d).toContain('L');
      }
    });

    it('color-codes by power ratio', () => {
      const gcode = `G0 X0 Y0
M3 S100
G1 X10 Y0 F1000
M5
G0 X20 Y0
M3 S900
G1 X30 Y0 F1000
M5`;
      const result = parseGCode(gcode, 1000);
      const colors = result.svgPaths.map((s) => s.stroke);
      expect(colors).toContain('#93c5fd');
      expect(colors).toContain('#ef4444');
    });
  });

  describe('bounds calculation', () => {
    it('returns correct bounds', () => {
      const gcode = `G0 X10 Y20
G1 X50 Y80 F1000
M5`;
      const result = parseGCode(gcode);
      expect(result.bounds.minX).toBe(10);
      expect(result.bounds.minY).toBe(20);
      expect(result.bounds.maxX).toBe(50);
      expect(result.bounds.maxY).toBe(80);
    });

    it('returns default bounds for empty input', () => {
      const result = parseGCode('');
      expect(result.bounds).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const result = parseGCode('');
      expect(result.paths.length).toBe(0);
      expect(result.svgPaths.length).toBe(0);
    });

    it('skips comments', () => {
      const gcode = `; This is a comment
G0 X0 Y0
; Another comment
M3 S500
G1 X10 Y0 F1000
M5`;
      const result = parseGCode(gcode);
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('handles inline comments', () => {
      const gcode = `G0 X0 Y0
G1 X10 Y0 F1000 ; move right
M5`;
      const result = parseGCode(gcode);
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('handles G0 rapid moves', () => {
      const gcode = `G0 X0 Y0
G0 X50 Y50`;
      const result = parseGCode(gcode);
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('handles Z axis changes', () => {
      const gcode = `G0 X0 Y0
G1 Z-1 F500
G1 X10 Y0 F1000
G1 Z0 F500
M5`;
      const result = parseGCode(gcode);
      expect(result.paths.some((p) => p.z === -1)).toBe(true);
    });

    it('handles multiple segments separated by laser state change', () => {
      const gcode = `G0 X0 Y0
M3 S500
G1 X10 Y0 F1000
M5
G0 X20 Y0
M3 S300
G1 X30 Y0 F1000
M5`;
      const result = parseGCode(gcode);
      const laserPaths = result.paths.filter((p) => p.isLaserOn);
      expect(laserPaths.length).toBe(2);
      expect(laserPaths[0].power).toBe(500);
      expect(laserPaths[1].power).toBe(300);
    });

    it('handles very long segment (>1000 points) by flushing', () => {
      let gcode = 'G0 X0 Y0\nM3 S500\n';
      for (let i = 1; i <= 1100; i++) {
        gcode += `G1 X${i} Y0 F1000\n`;
      }
      gcode += 'M5';
      const result = parseGCode(gcode);
      expect(result.paths.length).toBeGreaterThan(1);
    });
  });
});
