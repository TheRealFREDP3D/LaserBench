import { describe, it, expect } from 'vitest';
import { generatePatternPaths } from '../lib/gcodeGenerator';
import { MachineProfile, MaterialProfile } from '../types';

const mockMachine: MachineProfile = {
  id: 'test',
  name: 'Test Machine',
  firmware: 'grbl',
  laserMode: 'M3_M5',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  safeZ: 5,
  workZ: 0,
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

describe('gcodeGenerator', () => {
  it('generates matrix pattern G-code', () => {
    const res = generatePatternPaths('matrix', mockMachine, mockMaterial, {
      powerMin: 100,
      powerMax: 500,
      powerSteps: 3,
      speedMin: 1000,
      speedMax: 2000,
      speedSteps: 2,
    });

    expect(res.gcode).toContain('G21');
    expect(res.gcode).toContain('M3 S100');
    expect(res.gcode).toContain('M3 S500');
    expect(res.svgPaths.length).toBeGreaterThan(0);
  });
});
