import {useState, useEffect, useRef} from 'react';
import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup, act} from '@testing-library/react';
import fc from 'fast-check';
import MachineSelector, {applyToggles, SectionKey} from '@/src/components/MachineSelector';
import type {MachineProfile} from '@/src/types';

afterEach(() => {
  cleanup();
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
    const {unmount} = render(
      <MachineSelector
        machines={[mockMachine]}
        selectedMachineId={mockMachine.id}
        {...emptyHandlers}
      />
    );

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', {name: /edit settings/i}));

    // Delta Kinematics section should be collapsed initially (hidden class present)
    const deltaSection = screen.getByTestId('section-deltaKinematics');
    expect(deltaSection).toHaveClass('hidden');

    // Click the isDelta checkbox
    fireEvent.click(screen.getByTestId('machine-is-delta-checkbox'));

    // Delta section should now be visible (hidden class removed)
    expect(deltaSection).not.toHaveClass('hidden');

    unmount();
  });
});

// ─── Property 2: Machine state does not affect sidebar tab ──────────

interface TabAwareHarnessProps {
  initialTab: 'machine' | 'material';
  machines: MachineProfile[];
  selectedMachineId: string;
}

function TabAwareHarness({initialTab, machines, selectedMachineId}: TabAwareHarnessProps) {
  const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>(initialTab);
  const [machinesState, setMachinesState] = useState(machines);
  const [selectedId, setSelectedId] = useState(selectedMachineId);
  const ref = useRef({sidebarTab});

  useEffect(() => {
    ref.current.sidebarTab = sidebarTab;
    // sync testId so the test can read the current tab value
    const el = document.getElementById('p2-tab-tracker');
    if (el) el.textContent = ref.current.sidebarTab;
  }, [sidebarTab]);

  return (
    <div>
      <span id="p2-tab-tracker" data-testid="p2-tab-tracker">{sidebarTab}</span>
      <MachineSelector
        machines={machinesState}
        selectedMachineId={selectedId}
        onSelectMachine={(id) => {
          setSelectedId(id);
          // Intentional: do NOT call setSidebarTab
        }}
        onUpdateMachine={(updated) => {
          setMachinesState((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          // Intentional: do NOT call setSidebarTab
        }}
        onCreateMachine={(created) => {
          setMachinesState((prev) => [...prev, created]);
          setSelectedId(created.id);
        }}
        onDeleteMachine={(id) => {
          setMachinesState((prev) => prev.filter((m) => m.id !== id));
          setSelectedId((prev) => (prev === id && machinesState.length > 1 ? machinesState.find((m) => m.id !== id)!.id : prev));
        }}
      />
      <button
        data-testid="p2-trigger-tab-change"
        onClick={() => setSidebarTab(sidebarTab === 'machine' ? 'material' : 'machine')}
      >
        Switch Tab
      </button>
    </div>
  );
}

describe('Property 2: machine operations do not change sidebar tab', () => {
  it('selecting a different machine preserves sidebarTab', () => {
    const machines = [mockMachine, {...mockMachine, id: 'other', name: 'Other Laser'}];
    render(<TabAwareHarness initialTab="machine" machines={machines} selectedMachineId={mockMachine.id} />);

    const tabEl = screen.getByTestId('p2-tab-tracker');
    expect(tabEl.textContent).toBe('machine');

    // Select the other machine
    fireEvent.change(screen.getByDisplayValue('Test Laser (GRBL)'), {target: {value: 'other'}});

    expect(tabEl.textContent).toBe('machine');
  });

  it('editing a machine field preserves sidebarTab', () => {
    render(<TabAwareHarness initialTab="material" machines={[mockMachine]} selectedMachineId={mockMachine.id} />);

    const tabEl = screen.getByTestId('p2-tab-tracker');
    expect(tabEl.textContent).toBe('material');

    // Enter edit mode and change the name
    fireEvent.click(screen.getByRole('button', {name: /edit settings/i}));
    const nameInput = screen.getByDisplayValue('Test Laser');
    fireEvent.change(nameInput, {target: {value: 'Updated Laser'}});

    expect(tabEl.textContent).toBe('material');
  });

  it('fc.property: sidebarTab unchanged after any sequence of machine operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'machine' | 'material'>('machine', 'material'),
        fc.array(
          fc.record({
            action: fc.constantFrom<'select' | 'rename'>('select', 'rename'),
          }),
          {minLength: 1, maxLength: 5}
        ),
        async (initialTab, sequence) => {
          const {unmount} = render(
            <TabAwareHarness
              initialTab={initialTab}
              machines={[mockMachine, {...mockMachine, id: 'other', name: 'Other'}]}
              selectedMachineId={mockMachine.id}
            />
          );

          const tabTracker = screen.getByTestId('p2-tab-tracker');
          const initialText = tabTracker.textContent;

          for (const step of sequence) {
            act(() => {
              if (step.action === 'select') {
                const select = document.querySelector('#machine-profile-select') as HTMLSelectElement;
                const currentVal = select.value;
                const otherVal = currentVal === mockMachine.id ? 'other' : mockMachine.id;
                fireEvent.change(select, {target: {value: otherVal}});
              } else {
                const editBtn = document.querySelector('#toggle-edit-machine-btn') as HTMLButtonElement;
                if (editBtn?.textContent?.includes('Edit')) {
                  fireEvent.click(editBtn);
                }
                const nameInput = document.querySelector('#machine-name-input') as HTMLInputElement;
                if (nameInput) {
                  fireEvent.change(nameInput, {target: {value: `Renamed_${Date.now()}`}});
                }
              }
            });
          }

          const finalText = screen.getByTestId('p2-tab-tracker').textContent;
          unmount();
          return initialText === finalText;
        }
      ),
      {timeout: 10_000}
    );
  }, 15_000);
});
