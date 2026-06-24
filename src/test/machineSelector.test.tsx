import { render, screen } from '@testing-library/react';
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
    safeZ: 10,
    workZ: 0,
    travelSpeed: 5000,
    bedShape: 'rectangular',
    bedWidth: 300,
    bedHeight: 300,
    baudRate: 115200,
  },
];

describe('MachineSelector', () => {
  it('renders correctly', () => {
    const onSelect = vi.fn();
    render(
      <ThemeProvider>
        <MachineSelector
          machines={mockMachines}
          selectedId="m1"
          onSelect={onSelect}
          onUpdate={vi.fn()}
          onCreate={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('Test Machine')).toBeInTheDocument();
  });
});
