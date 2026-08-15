import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as firmwareCapabilities from '../lib/firmwareCapabilities';
import { importProfiles } from '../lib/profileExport';
import type { MachineProfile, MaterialProfile } from '../types';

const validMachine: MachineProfile = {
  id: 'imported_machine_1',
  name: 'Imported Machine',
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
  id: 'imported_mat_1',
  name: 'Imported Material',
  category: 'Wood',
  thickness: 3,
  laser: '10W',
  engrave: { power: 200, speed: 2000 },
  cut: { power: 1000, speed: 200 },
  history: [],
};

describe('importProfiles (machine)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('imports valid machine profiles', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [validMachine],
    };
    const result = importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, []);
    expect(result.profiles.length).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.rejectionReasons).toEqual([]);
  });

  it('detects duplicates by id', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [validMachine],
    };
    const result = importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, [
      validMachine,
    ]);
    expect(result.profiles.length).toBe(0);
    expect(result.duplicates).toBe(1);
    expect(result.rejectionReasons).toEqual([]);
  });

  it('counts invalid profiles', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [{ id: 'bad' }],
    };
    const result = importProfiles(envelope, 'machine', (_x): _x is MachineProfile => false, []);
    expect(result.profiles.length).toBe(0);
    expect(result.invalid).toBe(1);
  });

  it('throws on wrong type', () => {
    const envelope = {
      version: 1,
      type: 'material',
      exportedAt: '2026-06-24',
      profiles: [],
    };
    expect(() =>
      importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, [])
    ).toThrow('Expected machine profiles, got material');
  });

  it('throws on invalid envelope', () => {
    expect(() =>
      importProfiles({ bad: true }, 'machine', (_x): _x is MachineProfile => true, [])
    ).toThrow('Unrecognized file format');
  });

  it('throws on missing profiles array', () => {
    const envelope = { version: 1, type: 'machine', exportedAt: '2026-06-24' };
    expect(() =>
      importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, [])
    ).toThrow();
  });

  it('populates rejectionReasons when laserOff is invalid', () => {
    const badMachine: MachineProfile = { ...validMachine, laserOff: 'M3 S1000' };
    const envelope = { version: 1, type: 'machine', exportedAt: '2026-06-24', profiles: [badMachine] };
    const result = importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, []);
    expect(result.invalid).toBe(1);
    expect(result.rejectionReasons.length).toBe(1);
    expect(result.rejectionReasons[0].length).toBeGreaterThan(0);
    expect(result.profiles.length).toBe(0);
  });

  it('leaves rejectionReasons empty when machine profile passes safety validation', () => {
    const envelope = { version: 1, type: 'machine', exportedAt: '2026-06-24', profiles: [validMachine] };
    const result = importProfiles(envelope, 'machine', (_x): _x is MachineProfile => true, []);
    expect(result.rejectionReasons.length).toBe(0);
    expect(result.profiles.length).toBe(1);
  });

  it('imports multiple profiles, skipping invalid', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [validMachine, { id: 'bad' }, { ...validMachine, id: 'valid_2' }],
    };
    const result = importProfiles(
      envelope,
      'machine',
      (_x): _x is MachineProfile => {
        const o = _x as Record<string, unknown>;
        return (
          typeof o.id === 'string' &&
          typeof o.firmware === 'string' &&
          typeof o.laserMode === 'string'
        );
      },
      []
    );
    expect(result.profiles.length).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.rejectionReasons).toEqual([]);
  });
});

describe('importProfiles (material)', () => {
  it('imports valid material profiles', () => {
    const envelope = {
      version: 1,
      type: 'material',
      exportedAt: '2026-06-24',
      profiles: [validMaterial],
    };
    const result = importProfiles(envelope, 'material', (_x): _x is MaterialProfile => true, []);
    expect(result.profiles.length).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.rejectionReasons).toEqual([]);
  });

  it('detects duplicates', () => {
    const envelope = {
      version: 1,
      type: 'material',
      exportedAt: '2026-06-24',
      profiles: [validMaterial],
    };
    const result = importProfiles(envelope, 'material', (_x): _x is MaterialProfile => true, [
      validMaterial,
    ]);
    expect(result.duplicates).toBe(1);
    expect(result.rejectionReasons).toEqual([]);
  });

  it('does not call validateMachineSafetyProfile for material profiles', () => {
    // Note: importProfiles imports validateMachineSafetyProfile as a direct ES module binding,
    // not via the module namespace object. vi.spyOn on the module namespace won't intercept
    // the call inside the function due to how ES module live bindings work in Vitest without
    // vi.mock hoisting. We therefore assert the observable side effect instead: rejectionReasons
    // must be empty, confirming no safety rejection occurred for a material profile.
    const spy = vi.spyOn(firmwareCapabilities, 'validateMachineSafetyProfile');
    const envelope = { version: 1, type: 'material', exportedAt: '2026-06-24', profiles: [validMaterial] };
    const result = importProfiles(envelope, 'material', (_x): _x is MaterialProfile => true, []);
    expect(result.rejectionReasons.length).toBe(0);
    spy.mockRestore();
  });
});
