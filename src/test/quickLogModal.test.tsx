import {describe, expect, it, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import QuickLogModal from '@/src/components/QuickLogModal';
import type {MaterialProfile} from '@/src/types';

afterEach(() => {
  cleanup();
});

const mockMaterial: MaterialProfile = {
  id: 'mat1', name: 'Birch Plywood', category: 'Wood',
  thickness: 3.0, laser: '5W Diode', focusZ: -40.0,
  engrave: {power: 500, speed: 1500}, cut: {power: 1000, speed: 150},
  history: [],
};

const defaultSnapshot = {
  powerMin: 50, powerMax: 255, speedMin: 800, speedMax: 3000,
  zMin: -3.0, zMax: 3.0, blockSize: 12,
};

describe('QuickLogModal component', () => {
  it('does not render when closed', () => {
    render(
      <QuickLogModal
        open={false} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with correct attributes when open', () => {
    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Log Burn Result');
  });

  it('displays machine name and material name in burn context', () => {
    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="My Laser" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    expect(screen.getByText('My Laser')).toBeInTheDocument();
    expect(screen.getByText('Birch Plywood')).toBeInTheDocument();
  });

  it('displays pattern label for the selected pattern type', () => {
    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="power_ramp" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    expect(screen.getByText('Power Ramp')).toBeInTheDocument();
  });

  it('pre-fills optimal power with midpoint of param range', () => {
    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    const powerInput = document.getElementById('quicklog-power') as HTMLInputElement;
    expect(powerInput.value).toBe('153'); // (50+255)/2 = 152.5, rounds to 153
  });

  it('calls onSave with correct data on form submit', () => {
    const onSave = vi.fn();

    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={onSave} theme="dark"
      />
    );

    // Fill in the notes
    fireEvent.change(document.getElementById('quicklog-notes')!, {target: {value: 'Test note'}});

    // Submit the form
    fireEvent.click(document.getElementById('quicklog-save-btn')!);

    expect(onSave).toHaveBeenCalledTimes(1);
    const [entry, optimal] = onSave.mock.calls[0];
    expect(entry.patternType).toBe('matrix');
    expect(entry.notes).toBe('Test note');
    expect(optimal.power).toBe(153); // (50+255)/2 = 152.5, rounds to 153
    expect(optimal.speed).toBe(1900); // (800+3000)/2 rounded
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();

    render(
      <QuickLogModal
        open={true} onClose={onClose} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn();

    render(
      <QuickLogModal
        open={true} onClose={onClose} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    fireEvent.click(screen.getByTestId('quick-log-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();

    render(
      <QuickLogModal
        open={true} onClose={onClose} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    fireEvent.click(screen.getByRole('button', {name: /close/i}));
    expect(onClose).toHaveBeenCalled();
  });

  it('user can change power value and it reflects in optimal', () => {
    render(
      <QuickLogModal
        open={true} onClose={() => {}} activeMaterial={mockMaterial}
        activeMachineName="Test" patternType="matrix" pwmMax={1000}
        paramSnapshot={defaultSnapshot} onSave={() => {}} theme="dark"
      />
    );

    const powerInput = document.getElementById('quicklog-power') as HTMLInputElement;
    fireEvent.change(powerInput, {target: {value: '200'}});
    expect(powerInput.value).toBe('200');
  });
});
