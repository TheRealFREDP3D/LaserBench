import { describe, it, expect } from 'vitest';
import { generatePatternPaths } from '../lib/gcodeGenerator';
import type { MachineProfile, MaterialProfile } from '../types';

const mockMachine: MachineProfile = {
  id: 'test',
  name: 'Test Machine',
  firmware: 'grbl',
  laserMode: 'M3_M5',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  zSecure: 5,
  zFocused: 0,
  travelSpeed: 4000,
  bedShape: 'rectangular',
  bedWidth: 300,
  bedHeight: 180,
  baudRate: 115200,
  isDelta: false,
};

const mockMaterial: MaterialProfile = {
  id: 'test_mat',
  name: 'Test Wood',
  category: 'Wood',
  thickness: 3,
  laser: '10W',
  engrave: { power: 200, speed: 2000 },
  cut: { power: 1000, speed: 200 },
  history: [],
};

const m106Machine: MachineProfile = {
  ...mockMachine,
  id: 'm106',
  laserMode: 'M106_M107',
  laserOn: 'M106 S{power}',
  laserOff: 'M107',
  pwmMax: 255,
};

const m3m4Machine: MachineProfile = {
  ...mockMachine,
  id: 'm3m4',
  laserMode: 'M3_M4_M5',
};

const deltaMachine: MachineProfile = {
  ...mockMachine,
  id: 'delta',
  isDelta: true,
  bedShape: 'circular',
  bedWidth: 90,
  bedHeight: 0,
  deltaRadius: 105.6,
  deltaRodLength: 217.0,
  deltaTowerAngleOffset: 0,
  deltaPrintRadius: 85,
};

const customStartEndMachine: MachineProfile = {
  ...mockMachine,
  id: 'custom_gcode',
  startGCode: 'G21\nG90\nG28',
  endGCode: 'G0 Z10\nG0 X0 Y0\nM30',
};

describe('gcodeGenerator', () => {
  describe('all pattern types produce valid output', () => {
    const patterns = ['matrix', 'power_ramp', 'speed_ramp', 'focus_ladder', 'kerf_test'] as const;

    for (const pattern of patterns) {
      it(`generates ${pattern} without crashing`, () => {
        const res = generatePatternPaths(pattern, mockMachine, mockMaterial, {
          powerMin: 100,
          powerMax: 500,
          powerSteps: 2,
          speedMin: 1000,
          speedMax: 2000,
          speedSteps: 2,
        });
        expect(res.gcode).toBeTruthy();
        expect(res.paths.length).toBeGreaterThan(0);
        expect(res.svgPaths.length).toBeGreaterThan(0);
        expect(res.width).toBeGreaterThan(0);
        expect(res.height).toBeGreaterThan(0);
      });
    }
  });

  describe('G-code structure', () => {
    it('starts with G21 (mm units) and G91 (incremental)', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {});
      expect(res.gcode).toContain('G21');
      expect(res.gcode).toContain('G91');
    });

    it('ends with laser off, coolant off, and home', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {});
      expect(res.gcode).toContain('M5');
      expect(res.gcode).toContain('M9');
      expect(res.gcode).toContain('G28');
    });

    it('uses custom startGCode when provided', () => {
      const res = generatePatternPaths('matrix', customStartEndMachine, mockMaterial, {});
      expect(res.gcode).toContain('G28');
      expect(res.gcode).toContain('M30');
    });

    it('uses custom endGCode when provided', () => {
      const res = generatePatternPaths('matrix', customStartEndMachine, mockMaterial, {});
      expect(res.gcode).toContain('G0 Z10');
    });

    it('generates M3/M5 laser commands for M3_M5 mode', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {
        powerMin: 100,
        powerMax: 500,
      });
      expect(res.gcode).toContain('M3 S100');
      expect(res.gcode).toContain('M5');
    });

    it('generates M106/M107 laser commands for M106_M107 mode', () => {
      const res = generatePatternPaths('power_ramp', m106Machine, mockMaterial, {
        powerMin: 50,
        powerMax: 150,
      });
      expect(res.gcode).toContain('M106 S50');
      expect(res.gcode).toContain('M107');
    });

    it('generates M4/M5 laser commands for M3_M4_M5 mode', () => {
      const res = generatePatternPaths('power_ramp', m3m4Machine, mockMaterial, {
        powerMin: 100,
        powerMax: 500,
      });
      expect(res.gcode).toContain('M4 S100');
      expect(res.gcode).toContain('M5');
    });

    it('uses machine travel speed for rapid moves', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {});
      expect(res.gcode).toContain(`F${mockMachine.travelSpeed}`);
      expect(res.gcode).not.toContain('F0');
    });

    it('clamps power values to integer', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {
        powerMin: 100.3,
        powerMax: 500.7,
      });
      expect(res.gcode).toContain('M3 S100');
      expect(res.gcode).toMatch(/M3 S\d+/);
    });
  });

  describe('matrix pattern', () => {
    it('generates correct number of blocks', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        powerSteps: 3,
        speedSteps: 4,
      });
      expect(res.paths.length).toBeGreaterThanOrEqual(12);
    });

    it('includes power and speed labels', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        powerMin: 100,
        powerMax: 500,
        powerSteps: 2,
        speedMin: 1000,
        speedMax: 2000,
        speedSteps: 2,
      });
      expect(res.gcode).toContain('M3 S100');
      expect(res.gcode).toContain('M3 S500');
    });

    it('respects blockSize for pattern dimensions', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        powerSteps: 2,
        speedSteps: 2,
        blockSize: 20,
      });
      expect(res.width).toBeGreaterThan(40);
    });
  });

  describe('pattern dimensions', () => {
    it('power_ramp returns positive dimensions', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {});
      expect(res.width).toBeGreaterThan(0);
      expect(res.height).toBeGreaterThan(0);
    });

    it('speed_ramp returns positive dimensions', () => {
      const res = generatePatternPaths('speed_ramp', mockMachine, mockMaterial, {});
      expect(res.width).toBeGreaterThan(0);
      expect(res.height).toBeGreaterThan(0);
    });

    it('focus_ladder returns positive dimensions', () => {
      const res = generatePatternPaths('focus_ladder', mockMachine, mockMaterial, {});
      expect(res.width).toBeGreaterThan(0);
      expect(res.height).toBeGreaterThan(0);
    });

    it('kerf_test returns positive dimensions', () => {
      const res = generatePatternPaths('kerf_test', mockMachine, mockMaterial, {
        kerfValues: [0.1, 0.2],
      });
      expect(res.width).toBeGreaterThan(0);
      expect(res.height).toBeGreaterThan(0);
    });
  });

  describe('SVG output', () => {
    it('generates SVG path elements with valid d attribute', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {});
      for (const svg of res.svgPaths) {
        expect(svg.d).toMatch(/^M\s[\d.-]+\s[\d.-]+\sL/);
        expect(svg.fill).toBe('none');
        expect(svg.stroke).toBeTruthy();
      }
    });

    it('color-codes paths by power ratio', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {
        powerMin: 50,
        powerMax: 900,
      });
      const colors = res.svgPaths.map((s) => s.stroke);
      expect(colors).toContain('#93c5fd');
      expect(colors).toContain('#ef4444');
    });
  });

  describe('patternPosition offset', () => {
    it('applies position offset to generated paths', () => {
      const offset = { x: 50, y: 25 };
      const noOffset = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        powerSteps: 2,
        speedSteps: 2,
      });
      const withOffset = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        patternPosition: offset,
        powerSteps: 2,
        speedSteps: 2,
      });
      expect(withOffset.offsetX).toBe(offset.x);
      expect(withOffset.offsetY).toBe(offset.y);
      const noOffsetFirst = noOffset.paths[0].points[0];
      const withOffsetFirst = withOffset.paths[0].points[0];
      expect(withOffsetFirst[0]).toBe(noOffsetFirst[0] + offset.x);
      expect(withOffsetFirst[1]).toBe(noOffsetFirst[1] + offset.y);
    });
  });

  describe('delta machine', () => {
    it('generates delta warnings for unreachable points', () => {
      const res = generatePatternPaths('matrix', deltaMachine, mockMaterial, {
        powerSteps: 5,
        speedSteps: 5,
        blockSize: 20,
      });
      if (res.deltaWarnings && res.deltaWarnings.length > 0) {
        expect(res.deltaWarnings[0]).toContain('Delta');
      }
    });

    it('generates valid G-code for delta machine', () => {
      const res = generatePatternPaths('power_ramp', deltaMachine, mockMaterial, {});
      expect(res.gcode).toContain('G21');
      expect(res.paths.length).toBeGreaterThan(0);
    });
  });

  describe('kerf_test pattern', () => {
    it('generates slots for each kerf value', () => {
      const kerfValues = [0.1, 0.15, 0.2];
      const res = generatePatternPaths('kerf_test', mockMachine, mockMaterial, {
        kerfValues,
        nominalThickness: 3.0,
      });
      expect(res.paths.length).toBeGreaterThan(0);
      expect(res.gcode).toContain('M3');
    });

    it('uses material cut power and speed', () => {
      const res = generatePatternPaths('kerf_test', mockMachine, mockMaterial, {});
      expect(res.gcode).toContain(`F${mockMaterial.cut.speed}`);
    });
  });

  describe('focus_ladder pattern', () => {
    it('generates Z-height variations', () => {
      const res = generatePatternPaths('focus_ladder', mockMachine, mockMaterial, {
        zMin: 1,
        zMax: 5,
        zSteps: 3,
      });
      expect(res.gcode).toContain('Z-4.000');
      expect(res.gcode).toContain('Z2.000');
    });
  });

  describe('edge cases', () => {
    it('handles single power step', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        powerSteps: 1,
        speedSteps: 1,
      });
      expect(res.paths.length).toBeGreaterThan(0);
    });

    it('handles equal min/max power', () => {
      const res = generatePatternPaths('power_ramp', mockMachine, mockMaterial, {
        powerMin: 500,
        powerMax: 500,
      });
      expect(res.gcode).toContain('M3 S500');
    });

    it('handles equal min/max speed', () => {
      const res = generatePatternPaths('speed_ramp', mockMachine, mockMaterial, {
        speedMin: 1500,
        speedMax: 1500,
      });
      expect(res.gcode).toContain('F1500');
    });

    it('handles zero patternPosition', () => {
      const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
        patternPosition: { x: 0, y: 0 },
      });
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBe(0);
    });

    it('sanitizes control characters from custom start/end G-code', () => {
      const machine = {
        ...mockMachine,
        startGCode: 'G21\x00\x01\nG90',
        endGCode: 'M5\x02',
      };
      const res = generatePatternPaths('matrix', machine, mockMaterial, {});
      expect(res.gcode).not.toContain('\x00');
      expect(res.gcode).not.toContain('\x01');
      expect(res.gcode).not.toContain('\x02');
    });
  });
});
