import {describe, expect, it, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup, act} from '@testing-library/react';
import GCodeOutput from '@/src/components/GCodeOutput';
import type {MachineProfile, MaterialProfile} from '@/src/types';

afterEach(() => {
  cleanup();
});

const mockMachine: MachineProfile = {
  id: 'm1', name: 'Test Laser', firmware: 'grbl',
  laserOn: 'M3 S{power}', laserOff: 'M5', pwmMax: 1000,
  safeZ: 5, workZ: 0, travelSpeed: 5000, bedShape: 'rectangular',
  bedWidth: 300, bedHeight: 300, originX: 0, originY: 0,
  acceleration: 1000, baudRate: 250000, isDelta: false,
};

const mockMaterial: MaterialProfile = {
  id: 'mat1', name: 'Birch Plywood', category: 'Wood',
  thickness: 3.0, laser: '5W Diode', focusZ: -40.0,
  engrave: {power: 500, speed: 1500}, cut: {power: 1000, speed: 150},
  history: [],
};

const sampleGcode = 'G90\nM3 S500\nG1 X10 Y10 F1500\nM5\nG1 X0 Y0 F5000';
const samplePaths = [
  {points: [[0, 0], [10, 10]] as [number, number][], power: 500, speed: 1500, z: 0, isLaserOn: true},
  {points: [[10, 10], [0, 0]] as [number, number][], power: 0, speed: 5000, z: 5, isLaserOn: false},
];

describe('GCodeOutput component', () => {
  it('renders stats banner with path count, distances, and duration', () => {
    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    expect(document.getElementById('gcode-stats-banner')).toBeInTheDocument();
    expect(screen.getByText(/1 path/)).toBeInTheDocument();
  });

  it('toggles line numbers on click', () => {
    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    const btn = document.getElementById('toggle-line-numbers-btn')!;
    expect(btn).toBeInTheDocument();

    // Line numbers hidden initially (no standalone "1" rendered as gutter)
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    fireEvent.click(btn);

    // Line numbers should appear
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('copy button calls clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {clipboard: {writeText}});

    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    await act(async () => {
      fireEvent.click(document.getElementById('copy-gcode-btn')!);
    });
    expect(writeText).toHaveBeenCalledWith(sampleGcode);
  });

  it('shows "Copied!" after successful copy', async () => {
    Object.assign(navigator, {clipboard: {writeText: vi.fn().mockResolvedValue(undefined)}});

    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    await act(async () => {
      fireEvent.click(document.getElementById('copy-gcode-btn')!);
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('download button is always present', () => {
    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    expect(document.getElementById('download-gcode-btn')).toBeInTheDocument();
  });

  it('renders gcode lines in the viewer', () => {
    render(
      <GCodeOutput gcode={sampleGcode} patternType="matrix" machine={mockMachine} material={mockMaterial} paths={samplePaths} />
    );

    // G90 appears in both header badge and code viewer — use getAllByText
    expect(screen.getAllByText(/G90/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/M3 S500/)).toBeInTheDocument();
  });
});
