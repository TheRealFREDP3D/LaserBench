import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MachineSelector from '../components/MachineSelector';
import { MachineProfile } from '../types';
import { ThemeProvider } from '../lib/themeContext';

const mockMachines: MachineProfile[] = [
  {
    id: 'm1',
    name: 'Test Machine',
    firmware: 'grbl',
    laserMode: 'M3_M5',
    laserOn: 'M3 S{power}',
    laserOff: 'M5',
    pwmMax: 1000,
    zSecure: 10,
    zFocused: 0,
    travelSpeed: 5000,
    bedShape: 'rectangular',
    bedWidth: 300,
    bedHeight: 300,
    baudRate: 115200,
  },
  {
    id: 'm2',
    name: 'Second Machine',
    firmware: 'marlin',
    laserMode: 'M3_M4_M5',
    laserOn: 'M3 S{power}',
    laserOff: 'M5',
    pwmMax: 1000,
    zSecure: 10,
    zFocused: 0,
    travelSpeed: 5000,
    bedShape: 'rectangular',
    bedWidth: 200,
    bedHeight: 200,
    baudRate: 250000,
  },
];

function renderMS(props: Partial<React.ComponentProps<typeof MachineSelector>> = {}) {
  const defaults = {
    machines: mockMachines,
    selectedId: 'm1',
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    onCreate: vi.fn(),
    onCreateBatch: vi.fn(),
    onDelete: vi.fn(),
  };
  return {
    ...render(
      <ThemeProvider>
        <MachineSelector {...defaults} {...props} />
      </ThemeProvider>
    ),
    ...defaults,
  };
}

describe('MachineSelector', () => {
  it('renders correctly', () => {
    renderMS();
    expect(screen.getByText('Test Machine')).toBeInTheDocument();
  });

  it('renders all machines in select', () => {
    renderMS();
    expect(screen.getByText('Test Machine')).toBeInTheDocument();
    expect(screen.getByText('Second Machine')).toBeInTheDocument();
  });

  it('calls onSelect when selecting a different machine', () => {
    const onSelect = vi.fn();
    renderMS({ onSelect });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'm2' } });
    expect(onSelect).toHaveBeenCalledWith('m2');
  });

  it('calls onCreate when clicking add button', () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    renderMS({ onCreate, onSelect });
    fireEvent.click(screen.getByTitle('Add new machine'));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalled();
  });

  it('calls onDelete when clicking delete and confirming', async () => {
    const onDelete = vi.fn();
    renderMS({ onDelete });
    fireEvent.click(screen.getByLabelText('Delete machine profile'));
    const confirmBtn = await screen.findByText('Confirm');
    await act(async () => {
      fireEvent.click(confirmBtn);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onDelete).toHaveBeenCalledWith('m1');
  });

  it('calls onUpdate when changing machine name', () => {
    const onUpdate = vi.fn();
    renderMS({ onUpdate });
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'My Laser' } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].name).toBe('My Laser');
  });

  it('toggles advanced G-Code section', () => {
    renderMS();
    expect(screen.queryByText('Start G-Code')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Advanced G-Code'));
    expect(screen.getByText('Start G-Code')).toBeInTheDocument();
    expect(screen.getByText('End G-Code')).toBeInTheDocument();
  });

  it('renders settings section with firmware select', () => {
    renderMS();
    expect(screen.getByText('Firmware')).toBeInTheDocument();
    expect(screen.getByText('Laser Mode')).toBeInTheDocument();
    expect(screen.getByText('Baud Rate')).toBeInTheDocument();
  });

  it('returns null when machines array is empty', () => {
    const { container } = render(
      <ThemeProvider>
        <MachineSelector
          machines={[]}
          selectedId=""
          onSelect={vi.fn()}
          onUpdate={vi.fn()}
          onCreate={vi.fn()}
          onCreateBatch={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});
