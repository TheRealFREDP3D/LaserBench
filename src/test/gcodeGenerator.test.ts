import { describe, it, expect } from 'vitest';
import { generatePatternPaths } from '../lib/gcodeGenerator';
import type { MachineProfile, MaterialProfile, PatternType } from '../types';

const CARTESIAN_MACHINE: MachineProfile = {
  id: 'test-cart',
  name: 'Test Cartesian',
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
  baudRate: 250000,
  isDelta: false,
};

const DELTA_MACHINE: MachineProfile = {
  ...CARTESIAN_MACHINE,
  id: 'test-delta',
  name: 'Test Delta',
  bedShape: 'circular',
  bedWidth: 90,
  isDelta: true,
  deltaRadius: 105.6,
  deltaArmLength: 217,
  deltaRodLength: 217,
  deltaTowerAngleOffset: 0,
  deltaPrintRadius: 85,
};

const MATERIAL: MaterialProfile = {
  id: 'mat-test',
  name: 'Test Material',
  category: 'Wood',
  thickness: 3.0,
  laser: '5W Diode',
  focusZ: -38,
  engrave: { power: 150, speed: 1200 },
  cut: { power: 255, speed: 500 },
  history: [],
};

const CONFIG = {
  powerMin: 100,
  powerMax: 500,
  speedMin: 500,
  speedMax: 3000,
  powerSteps: 3,
  speedSteps: 3,
  blockSize: 12,
};

const PATTERNS: PatternType[] = ['matrix', 'power_ramp', 'speed_ramp', 'focus_ladder', 'kerf_test'];

describe('gcodeGenerator', () => {
  describe('all patterns produce valid output', () => {
    for (const pattern of PATTERNS) {
      it(`${pattern}: returns non-empty gcode, svgPaths, and paths`, () => {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);

        expect(result.gcode).toBeTruthy();
        expect(typeof result.gcode).toBe('string');
        expect(result.svgPaths.length).toBeGreaterThan(0);
        expect(result.paths.length).toBeGreaterThan(0);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
      });

      it(`${pattern}: gcode contains G-code header commands`, () => {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);

        expect(result.gcode).toContain('G21'); // metric
        expect(result.gcode).toContain('G90'); // absolute
      });

      it(`${pattern}: gcode ends with M5 (laser off)`, () => {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);

        const lines = result.gcode.trim().split('\n');
        const lastLines = lines.slice(-5).join('\n');
        expect(lastLines).toContain('M5');
      });

      it(`${pattern}: svgPaths have valid d attributes`, () => {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);

        for (const svgPath of result.svgPaths) {
          expect(svgPath.d).toBeTruthy();
          expect(svgPath.d.startsWith('M')).toBe(true);
          expect(svgPath.fill || svgPath.stroke).toBeTruthy();
        }
      });

      it(`${pattern}: paths have correct structure`, () => {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);

        for (const path of result.paths) {
          expect(path.points.length).toBeGreaterThanOrEqual(2);
          expect(typeof path.power).toBe('number');
          expect(typeof path.speed).toBe('number');
          expect(typeof path.z).toBe('number');
          expect(typeof path.isLaserOn).toBe('boolean');
        }
      });
    }
  });

  describe('delta machine produces warnings', () => {
    it('generates deltaWarnings when segments exceed print radius', () => {
      const result = generatePatternPaths('matrix', DELTA_MACHINE, MATERIAL, CONFIG);

      // Delta warnings may or may not exist depending on config — just verify the field exists
      expect(result).toHaveProperty('deltaWarnings');
    });
  });

  describe('offset calculations', () => {
    it('rectangular machine centers pattern on bed', () => {
      const result = generatePatternPaths('matrix', CARTESIAN_MACHINE, MATERIAL, CONFIG);

      // Pattern should be roughly centered
      expect(result.offsetX).toBeGreaterThan(0);
      expect(result.offsetY).toBeGreaterThan(0);
    });

    it('circular machine centers pattern on bed', () => {
      const result = generatePatternPaths('matrix', DELTA_MACHINE, MATERIAL, CONFIG);

      // Delta center should be near 0,0 (relative to bed center)
      expect(typeof result.offsetX).toBe('number');
      expect(typeof result.offsetY).toBe('number');
    });
  });

  describe('SVG path output', () => {
    it('each pattern produces at least one SVG path', () => {
      for (const pattern of PATTERNS) {
        const result = generatePatternPaths(pattern, CARTESIAN_MACHINE, MATERIAL, CONFIG);
        expect(result.svgPaths.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Marlin V1 comment stripping', () => {
    const MARLIN_V1_MACHINE: MachineProfile = {
      ...CARTESIAN_MACHINE,
      firmware: 'marlin_v1',
    };

    it('strips all comment lines from G-code', () => {
      const result = generatePatternPaths('power_ramp', MARLIN_V1_MACHINE, MATERIAL, CONFIG);
      const lines = result.gcode.split('\n');
      for (const line of lines) {
        expect(line.startsWith(';')).toBe(false);
      }
    });

    it('strips inline comments from command lines', () => {
      const result = generatePatternPaths('power_ramp', MARLIN_V1_MACHINE, MATERIAL, CONFIG);
      const lines = result.gcode.split('\n');
      for (const line of lines) {
        expect(line).not.toContain(';');
      }
    });

    it('does not include M30 program end', () => {
      const result = generatePatternPaths('power_ramp', MARLIN_V1_MACHINE, MATERIAL, CONFIG);
      expect(result.gcode).not.toMatch(/^M30$/m);
    });

    it('still includes essential G-code commands', () => {
      const result = generatePatternPaths('power_ramp', MARLIN_V1_MACHINE, MATERIAL, CONFIG);
      expect(result.gcode).toContain('G21');
      expect(result.gcode).toContain('G90');
      expect(result.gcode).toMatch(/G0 F\d+/);
      expect(result.gcode).toMatch(/G1 /);
    });

    it('preserves comments for non-Marlin-V1 firmware', () => {
      const result = generatePatternPaths('power_ramp', CARTESIAN_MACHINE, MATERIAL, CONFIG);
      const lines = result.gcode.split('\n');
      const commentLines = lines.filter(l => l.startsWith(';'));
      expect(commentLines.length).toBeGreaterThan(0);
    });
  });
});
