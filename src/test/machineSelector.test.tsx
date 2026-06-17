import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import MachineSelector, {applyToggles, SectionKey} from '@/src/components/MachineSelector';
import type {MachineProfile} from '@/src/types';

afterEach(() => {
  document.body.innerHTML = '';
});

const mockMachine: MachineProfile = {
  id: 'test-1',
  name: 'Test Laser',
  firmware: 'grbl',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  safeZ: 5,
  workZ: 0,
  travelSpeed: 5000,
  bedShape: 'rectangular',
  bedWidth: 300,
  bedHeight: 300,
  originX: 0,
  originY: 0,
  acceleration: 1000,
  isDelta: false,
};

const mockDeltaMachine: MachineProfile = {
  ...mockMachine,
  id: 'test-2',
  name: 'Delta Laser',
  firmware: 'grbl',
  isDelta: true,
  deltaRadius: 100,
  deltaArmLength: 250,
  deltaRodLength: 300,
  deltaTowerAngleOffset: 0,
  deltaPrintRadius: 80,
};

const emptyHandlers = {
  onSelectMachine: () => {},
  onUpdateMachine: () => {},
  onCreateMachine: () => {},
  onDeleteMachine: () => {},
};

const DEFAULT_COLLAPSED: Record<SectionKey, boolean> = {
  laserCommands: true,
  motionZ: true,
  bedGeometry: false,
  deltaKinematics: true,
};

// ─── Property 3: Section collapse invariant ─────────────────────────

describe('Property 3: MachineSelector section collapse invariant', () => {
  it('fc.property: at least one section is always expanded after any toggle sequence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<SectionKey>('laserCommands', 'motionZ', 'bedGeometry', 'deltaKinematics'),
          {minLength: 1, maxLength: 20}
        ),
        (actions) => {
          const result = applyToggles(DEFAULT_COLLAPSED, actions);
          return Object.values(result).some((v) => !v);
        }
      )
    );
  });

  it('single toggle on currently-expanded section keeps it collapsed (at least one expanded)', () => {
    // bedGeometry starts expanded (false); toggling it should collapse it
    const result = applyToggles(DEFAULT_COLLAPSED, ['bedGeometry']);
    // laserCommands=true, motionZ=true, bedGeometry=true, deltaKinematics=true → all collapsed
    // But toggleSection prevents all-collapsed → bedGeometry stays false
    expect(result.bedGeometry).toBe(false);
  });

  it('toggling all sections repeatedly never produces all-collapsed', () => {
    const actions: SectionKey[] = [
      'laserCommands', 'motionZ', 'bedGeometry', 'deltaKinematics',
      'laserCommands', 'motionZ', 'bedGeometry', 'deltaKinematics',
      'laserCommands', 'motionZ',
    ];
    const result = applyToggles(DEFAULT_COLLAPSED, actions);
    expect(Object.values(result).some((v) => !v)).toBe(true);
  });
});

// ─── Property 4: MachineSelector header always shows machine identity ─

describe('Property 4: MachineSelector always-visible header', () => {
  it('renders machine name and firmware in the header for any machine profile', () => {
    render(
      <MachineSelector
        machines={[mockMachine]}
        selectedMachineId={mockMachine.id}
        {...emptyHandlers}
      />
    );

    expect(screen.getByTestId('machine-header-name')).toHaveTextContent('Test Laser');
    expect(screen.getByTestId('machine-header-firmware')).toHaveTextContent('grbl');
  });

  it('renders header info for delta machine profile', () => {
    render(
      <MachineSelector
        machines={[mockDeltaMachine]}
        selectedMachineId={mockDeltaMachine.id}
        {...emptyHandlers}
      />
    );

    expect(screen.getByTestId('machine-header-name')).toHaveTextContent('Delta Laser');
    expect(screen.getByTestId('machine-header-firmware')).toHaveTextContent('grbl');
  });

  it('header info remains visible when switching between machines', () => {
    const {rerender} = render(
      <MachineSelector
        machines={[mockMachine, mockDeltaMachine]}
        selectedMachineId={mockMachine.id}
        {...emptyHandlers}
      />
    );

    expect(screen.getByTestId('machine-header-name')).toHaveTextContent('Test Laser');

    rerender(
      <MachineSelector
        machines={[mockMachine, mockDeltaMachine]}
        selectedMachineId={mockDeltaMachine.id}
        {...emptyHandlers}
      />
    );

    expect(screen.getByTestId('machine-header-name')).toHaveTextContent('Delta Laser');
  });

  it('header info visible regardless of collapsed sections', () => {
    render(
      <MachineSelector
        machines={[mockMachine]}
        selectedMachineId={mockMachine.id}
        {...emptyHandlers}
      />
    );

    expect(screen.getByTestId('machine-header-name')).toBeInTheDocument();
    expect(screen.getByTestId('machine-header-firmware')).toBeInTheDocument();
    expect(screen.getByTestId('machine-header-pwm')).toBeInTheDocument();
  });

  it('isDelta toggle expands deltaKinematics section', () => {
    render(
      <MachineSelector
        machines={[mockMachine]}
        selectedMachineId={mockMachine.id}
        {...emptyHandlers}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', {name: /edit settings/i}));

    // Delta Kinematics section should be collapsed initially
    const deltaSection = screen.getByTestId('section-deltaKinematics');
    expect(deltaSection.className).toContain('hidden');

    // Click the isDelta checkbox
    fireEvent.click(screen.getByTestId('machine-is-delta-checkbox'));

    // Delta section should now be visible (no longer hidden)
    expect(deltaSection.className).not.toContain('hidden');
  });
});
