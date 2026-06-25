import { describe, it, expect, beforeEach } from 'vitest';
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
  safeZ: 5,
  workZ: 0,
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
    const result = importProfiles(envelope, 'machine', (x): x is MachineProfile => true, []);
    expect(result.profiles.length).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.invalid).toBe(0);
  });

  it('detects duplicates by id', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [validMachine],
    };
    const result = importProfiles(envelope, 'machine', (x): x is MachineProfile => true, [
      validMachine,
    ]);
    expect(result.profiles.length).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('counts invalid profiles', () => {
    const envelope = {
      version: 1,
      type: 'machine',
      exportedAt: '2026-06-24',
      profiles: [{ id: 'bad' }],
    };
    const result = importProfiles(envelope, 'machine', (x): x is MachineProfile => false, []);
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
    expect(() => importProfiles(envelope, 'machine', (x): x is MachineProfile => true, [])).toThrow(
      'Expected machine profiles, got material'
    );
  });

  it('throws on invalid envelope', () => {
    expect(() =>
      importProfiles({ bad: true }, 'machine', (x): x is MachineProfile => true, [])
    ).toThrow('Unrecognized file format');
  });

  it('throws on missing profiles array', () => {
    const envelope = { version: 1, type: 'machine', exportedAt: '2026-06-24' };
    expect(() =>
      importProfiles(envelope, 'machine', (x): x is MachineProfile => true, [])
    ).toThrow();
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
      (x): x is MachineProfile => {
        const o = x as Record<string, unknown>;
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
    const result = importProfiles(envelope, 'material', (x): x is MaterialProfile => true, []);
    expect(result.profiles.length).toBe(1);
    expect(result.duplicates).toBe(0);
  });

  it('detects duplicates', () => {
    const envelope = {
      version: 1,
      type: 'material',
      exportedAt: '2026-06-24',
      profiles: [validMaterial],
    };
    const result = importProfiles(envelope, 'material', (x): x is MaterialProfile => true, [
      validMaterial,
    ]);
    expect(result.duplicates).toBe(1);
  });
});
