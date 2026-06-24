import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredMachines, INITIAL_MACHINES } from '../lib/materialPresets';

describe('materialPresets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads initial machines if storage empty', () => {
    const machines = getStoredMachines();
    expect(machines.length).toBe(INITIAL_MACHINES.length);
    expect(machines[0].id).toBe(INITIAL_MACHINES[0].id);
  });

  it('validates machines correctly', () => {
    localStorage.setItem(
      'laserbench_machines',
      JSON.stringify([
        {
          id: 'bad',
          name: 'Bad Machine',
          // missing fields
        },
      ])
    );
    const machines = getStoredMachines();
    expect(machines[0].id).toBe(INITIAL_MACHINES[0].id);
  });
});
