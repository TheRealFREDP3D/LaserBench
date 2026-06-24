import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GCodeOutput from '../components/GCodeOutput';
import { MachineProfile, MaterialProfile } from '../types';

const mockMachine: MachineProfile = {
  id: 'm1',
  name: 'Machine',
  firmware: 'grbl',
  laserMode: 'M3_M5',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  safeZ: 10,
  workZ: 0,
  travelSpeed: 5000,
  bedShape: 'rectangular',
  bedWidth: 200,
  bedHeight: 200,
  baudRate: 115200,
};

const mockMaterial: MaterialProfile = {
  id: 'mat1',
  name: 'Material',
  category: 'Wood',
  thickness: 3,
  laser: '5W',
  engrave: { power: 100, speed: 1000 },
  cut: { power: 255, speed: 100 },
  history: [],
};

describe('GCodeOutput', () => {
  it('renders gcode lines', () => {
    render(
      <GCodeOutput
        gcode="G0 X10 Y10\nM3 S100"
        patternType="matrix"
        machine={mockMachine}
        material={mockMaterial}
        paths={[]}
      />
    );
    expect(screen.getByText(/G0 X10 Y10/)).toBeInTheDocument();
  });
});
