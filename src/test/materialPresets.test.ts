import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidMachineProfile,
  isValidMaterialProfile,
  getStoredMachines,
  getStoredMaterials,
  saveStoredMachines,
  saveStoredMaterials,
  INITIAL_MACHINES,
  INITIAL_MATERIALS,
} from '../lib/materialPresets';

import type { MachineProfile, MaterialProfile } from '../types';

const validMachine: MachineProfile = {
  id: 'test',
  name: 'Test',
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
};

const validMaterial: MaterialProfile = {
  id: 'mat1',
  name: 'Test Material',
  category: 'Wood',
  thickness: 3,
  laser: '10W',
  engrave: { power: 200, speed: 2000 },
  cut: { power: 1000, speed: 200 },
  history: [],
};

describe('isValidMachineProfile', () => {
  it('accepts valid machine profile', () => {
    expect(isValidMachineProfile(validMachine)).toBe(true);
  });

  it('accepts machine with optional fields', () => {
    expect(
      isValidMachineProfile({
        ...validMachine,
        originX: 10,
        originY: 20,
        acceleration: 1500,
        startGCode: 'G28',
        endGCode: 'M30',
        isDelta: true,
        deltaRadius: 100,
        deltaRodLength: 200,
        deltaTowerAngleOffset: 0,
        deltaPrintRadius: 80,
      })
    ).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidMachineProfile(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isValidMachineProfile('string')).toBe(false);
    expect(isValidMachineProfile(42)).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...rest } = validMachine;
    expect(isValidMachineProfile(rest)).toBe(false);
  });

  it('rejects invalid firmware', () => {
    expect(isValidMachineProfile({ ...validMachine, firmware: 'invalid' })).toBe(false);
  });

  it('accepts marlin firmware', () => {
    expect(isValidMachineProfile({ ...validMachine, firmware: 'marlin' })).toBe(true);
  });

  it('rejects invalid laserMode', () => {
    expect(isValidMachineProfile({ ...validMachine, laserMode: 'invalid' })).toBe(false);
  });

  it('accepts all valid laser modes', () => {
    expect(isValidMachineProfile({ ...validMachine, laserMode: 'M3_M5' })).toBe(true);
    expect(isValidMachineProfile({ ...validMachine, laserMode: 'M106_M107' })).toBe(true);
    expect(isValidMachineProfile({ ...validMachine, laserMode: 'M3_M4_M5' })).toBe(true);
  });

  it('rejects invalid bedShape', () => {
    expect(isValidMachineProfile({ ...validMachine, bedShape: 'triangle' })).toBe(false);
  });

  it('accepts circular bedShape', () => {
    expect(isValidMachineProfile({ ...validMachine, bedShape: 'circular' })).toBe(true);
  });

  it('rejects non-number baudRate', () => {
    expect(isValidMachineProfile({ ...validMachine, baudRate: '115200' })).toBe(false);
  });

  it('rejects non-finite baudRate', () => {
    expect(isValidMachineProfile({ ...validMachine, baudRate: NaN })).toBe(false);
    expect(isValidMachineProfile({ ...validMachine, baudRate: Infinity })).toBe(false);
  });

  it('rejects zero baudRate', () => {
    expect(isValidMachineProfile({ ...validMachine, baudRate: 0 })).toBe(false);
  });

  it('rejects negative baudRate', () => {
    expect(isValidMachineProfile({ ...validMachine, baudRate: -115200 })).toBe(false);
  });

  it('rejects wrong type for optional fields', () => {
    expect(isValidMachineProfile({ ...validMachine, originX: '10' })).toBe(false);
    expect(isValidMachineProfile({ ...validMachine, acceleration: '1000' })).toBe(false);
    expect(isValidMachineProfile({ ...validMachine, startGCode: 123 })).toBe(false);
    expect(isValidMachineProfile({ ...validMachine, isDelta: 'true' })).toBe(false);
  });

  it('validates all INITIAL_MACHINES', () => {
    for (const m of INITIAL_MACHINES) {
      expect(isValidMachineProfile(m)).toBe(true);
    }
  });
});

describe('isValidMaterialProfile', () => {
  it('accepts valid material profile', () => {
    expect(isValidMaterialProfile(validMaterial)).toBe(true);
  });

  it('accepts material with focusZ', () => {
    expect(isValidMaterialProfile({ ...validMaterial, focusZ: 5 })).toBe(true);
  });

  it('accepts material with history entries', () => {
    expect(
      isValidMaterialProfile({
        ...validMaterial,
        history: [
          {
            id: 'h1',
            date: '2026-01-01',
            notes: 'Test',
            optimalPower: 150,
            optimalSpeed: 1600,
          },
        ],
      })
    ).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidMaterialProfile(null)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isValidMaterialProfile('string')).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...rest } = validMaterial;
    expect(isValidMaterialProfile(rest)).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(isValidMaterialProfile({ ...validMaterial, category: 'Glass' })).toBe(false);
  });

  it('accepts all valid categories', () => {
    const cats = ['Wood', 'Plastics', 'Leather', 'Stone', 'Metals', 'Paper/Cardboard', 'Other'];
    for (const cat of cats) {
      expect(isValidMaterialProfile({ ...validMaterial, category: cat })).toBe(true);
    }
  });

  it('rejects non-object engrave', () => {
    expect(isValidMaterialProfile({ ...validMaterial, engrave: 'bad' })).toBe(false);
  });

  it('rejects non-object cut', () => {
    expect(isValidMaterialProfile({ ...validMaterial, cut: 'bad' })).toBe(false);
  });

  it('rejects non-array history', () => {
    expect(isValidMaterialProfile({ ...validMaterial, history: 'bad' })).toBe(false);
  });

  it('rejects invalid history entry', () => {
    expect(
      isValidMaterialProfile({
        ...validMaterial,
        history: [{ id: 123, date: '2026-01-01', notes: 'Test' }],
      })
    ).toBe(false);
  });

  it('rejects wrong type for optional focusZ', () => {
    expect(isValidMaterialProfile({ ...validMaterial, focusZ: '5' })).toBe(false);
  });

  it('validates all INITIAL_MATERIALS', () => {
    for (const m of INITIAL_MATERIALS) {
      expect(isValidMaterialProfile(m)).toBe(true);
    }
  });
});

describe('localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads initial machines when storage empty', () => {
    const machines = getStoredMachines();
    expect(machines.length).toBe(INITIAL_MACHINES.length);
    expect(machines[0].id).toBe(INITIAL_MACHINES[0].id);
  });

  it('loads initial materials when storage empty', () => {
    const materials = getStoredMaterials();
    expect(materials.length).toBe(INITIAL_MATERIALS.length);
    expect(materials[0].id).toBe(INITIAL_MATERIALS[0].id);
  });

  it('saves and loads machines', () => {
    const custom = [{ ...validMachine, id: 'custom1' }];
    saveStoredMachines(custom);
    const loaded = getStoredMachines();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('custom1');
  });

  it('saves and loads materials', () => {
    const custom = [{ ...validMaterial, id: 'custom_mat1' }];
    saveStoredMaterials(custom);
    const loaded = getStoredMaterials();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('custom_mat1');
  });

  it('resets to defaults on invalid JSON', () => {
    localStorage.setItem('laserbench_machines', 'not-json');
    const machines = getStoredMachines();
    expect(machines[0].id).toBe(INITIAL_MACHINES[0].id);
  });

  it('resets to defaults on invalid schema', () => {
    localStorage.setItem('laserbench_machines', JSON.stringify([{ id: 'bad' }]));
    const machines = getStoredMachines();
    expect(machines[0].id).toBe(INITIAL_MACHINES[0].id);
  });

  it('resets materials to defaults on invalid JSON', () => {
    localStorage.setItem('laserbench_materials', '{broken}');
    const materials = getStoredMaterials();
    expect(materials[0].id).toBe(INITIAL_MATERIALS[0].id);
  });
});
