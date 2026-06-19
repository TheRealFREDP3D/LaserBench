import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredMaterials,
  saveStoredMaterials,
  getStoredMachines,
  saveStoredMachines,
  INITIAL_MATERIALS,
  INITIAL_MACHINES,
} from '../lib/materialPresets';
import type { MaterialProfile, MachineProfile } from '../types';

describe('materialPresets localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredMaterials', () => {
    it('returns INITIAL_MATERIALS when localStorage is empty', () => {
      const result = getStoredMaterials();
      expect(result).toEqual(INITIAL_MATERIALS);
    });

    it('returns stored materials from localStorage', () => {
      const custom: MaterialProfile[] = [{
        id: 'custom-1',
        name: 'Custom Wood',
        category: 'Wood',
        thickness: 3.0,
        laser: '5W',
        focusZ: -38,
        engrave: { power: 100, speed: 1000 },
        cut: { power: 200, speed: 500 },
        history: [],
      }];
      localStorage.setItem('laserbench_materials', JSON.stringify(custom));

      const result = getStoredMaterials();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Custom Wood');
    });

    it('returns INITIAL_MATERIALS when localStorage has invalid JSON', () => {
      localStorage.setItem('laserbench_materials', '{invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = getStoredMaterials();
      expect(result).toEqual(INITIAL_MATERIALS);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('saveStoredMaterials', () => {
    it('saves materials to localStorage', () => {
      const materials: MaterialProfile[] = [{
        id: 'test-1',
        name: 'Test Mat',
        category: 'Wood',
        thickness: 1.0,
        laser: '5W',
        focusZ: -38,
        engrave: { power: 100, speed: 1000 },
        cut: { power: 200, speed: 500 },
        history: [],
      }];
      saveStoredMaterials(materials);

      const stored = JSON.parse(localStorage.getItem('laserbench_materials')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Test Mat');
    });

    it('round-trips through save/load', () => {
      const materials = [...INITIAL_MATERIALS];
      saveStoredMaterials(materials);
      const loaded = getStoredMaterials();
      expect(loaded).toEqual(materials);
    });
  });

  describe('getStoredMachines', () => {
    it('returns INITIAL_MACHINES when localStorage is empty', () => {
      const result = getStoredMachines();
      expect(result).toEqual(INITIAL_MACHINES);
    });

    it('returns stored machines from localStorage', () => {
      const custom: MachineProfile[] = [{
        id: 'custom-mach',
        name: 'Custom Machine',
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
      }];
      localStorage.setItem('laserbench_machines', JSON.stringify(custom));

      const result = getStoredMachines();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Custom Machine');
    });

    it('returns INITIAL_MACHINES when localStorage has invalid JSON', () => {
      localStorage.setItem('laserbench_machines', 'not json!!!');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = getStoredMachines();
      expect(result).toEqual(INITIAL_MACHINES);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('saveStoredMachines', () => {
    it('round-trips through save/load', () => {
      const machines = [...INITIAL_MACHINES];
      saveStoredMachines(machines);
      const loaded = getStoredMachines();
      expect(loaded).toEqual(machines);
    });
  });
});
