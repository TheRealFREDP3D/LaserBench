import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PrinterConsole } from '../components/PrinterConsole';
import { ThemeProvider } from '../lib/themeContext';
import type { MachineProfile } from '../types';

const mockMachine: MachineProfile = {
  id: 'test',
  name: 'Test Machine',
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

const defaultProps = {
  isConnected: false,
  messages: [],
  isPrinting: false,
  progress: 0,
  isHomed: true,
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onSend: vi.fn(),
  onClear: vi.fn(),
  onAbortPrint: vi.fn(),
  onJogRelative: vi.fn(),
  activeMachine: mockMachine,
  onHome: vi.fn(),
};

function renderConsole(overrides = {}) {
  return render(
    <ThemeProvider>
      <PrinterConsole {...defaultProps} {...overrides} />
    </ThemeProvider>
  );
}

describe('PrinterConsole', () => {
  it('renders the console title', () => {
    renderConsole();
    expect(screen.getByText('Hardware Console')).toBeInTheDocument();
  });

  it('shows Connect button when disconnected', () => {
    renderConsole();
    expect(screen.getByText('Connect')).toBeInTheDocument();
  });

  it('shows Disconnect button when connected', () => {
    renderConsole({ isConnected: true });
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    renderConsole({ isConnected: true });
    const dot = document.querySelector('.bg-green-500');
    expect(dot).toBeInTheDocument();
  });

  it('shows offline indicator when disconnected', () => {
    renderConsole();
    const dot = document.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders jog buttons', () => {
    renderConsole({ isConnected: true });
    expect(screen.getByTitle('Jog Up (↑)')).toBeInTheDocument();
    expect(screen.getByTitle('Jog Down (↓)')).toBeInTheDocument();
    expect(screen.getByTitle('Jog Left (←)')).toBeInTheDocument();
    expect(screen.getByTitle('Jog Right (→)')).toBeInTheDocument();
    expect(screen.getByTitle('Home (H)')).toBeInTheDocument();
  });

  it('renders FIRE and E-STOP buttons', () => {
    renderConsole({ isConnected: true });
    expect(screen.getByText('FIRE')).toBeInTheDocument();
    expect(screen.getByText('E-STOP')).toBeInTheDocument();
  });

  it('renders auto-scroll badge', () => {
    renderConsole();
    expect(screen.getByText('⬇ AUTO')).toBeInTheDocument();
  });

  it('calls onSend with M112 when E-STOP clicked', () => {
    const onSend = vi.fn();
    renderConsole({ isConnected: true, onSend });
    fireEvent.click(screen.getByText('E-STOP'));
    expect(onSend).toHaveBeenCalledWith('M112');
  });

  it('disables controls when not connected', () => {
    renderConsole({ isConnected: false });
    const estop = screen.getByText('E-STOP').closest('button')!;
    expect(estop).toBeDisabled();
  });

  it('shows printing progress when printing', () => {
    renderConsole({ isPrinting: true, progress: 42 });
    expect(screen.getByText('PRINTING: 42%')).toBeInTheDocument();
    expect(screen.getByText('Abort Print')).toBeInTheDocument();
  });

  it('calls onAbortPrint when abort clicked', () => {
    const onAbortPrint = vi.fn();
    renderConsole({ isPrinting: true, onAbortPrint });
    fireEvent.click(screen.getByText('Abort Print'));
    expect(onAbortPrint).toHaveBeenCalled();
  });

  it('renders messages in the log', () => {
    const messages = [
      { type: 'sent' as const, text: 'G28', timestamp: Date.now() },
      { type: 'received' as const, text: 'ok', timestamp: Date.now() },
    ];
    renderConsole({ messages });
    expect(screen.getByText('G28')).toBeInTheDocument();
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    renderConsole({ messages: [] });
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });

  it('calls onClear when trash clicked', () => {
    const onClear = vi.fn();
    renderConsole({ onClear });
    const trashBtn = document.querySelector('.text-zinc-500.hover\\:text-zinc-300');
    if (trashBtn) fireEvent.click(trashBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it('renders Z jog buttons', () => {
    renderConsole({ isConnected: true });
    expect(screen.getByText('Z+')).toBeInTheDocument();
    expect(screen.getByText('Z-')).toBeInTheDocument();
  });

  it('shows keyboard shortcut badges on desktop', () => {
    renderConsole({ isConnected: true });
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Esc')).toBeInTheDocument();
  });

  it('renders Run Job button when onPrint and gcode provided', () => {
    renderConsole({
      isConnected: true,
      onPrint: vi.fn(),
      gcode: 'G28\nM3 S500',
    });
    expect(screen.getByText('Run Job')).toBeInTheDocument();
  });

  it('sends machine laserOff command when FIRE is released', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderConsole({ isConnected: true, onSend });
    fireEvent.pointerDown(screen.getByText('FIRE'));
    fireEvent.pointerUp(screen.getByText('FIRE'));
    expect(onSend).toHaveBeenCalledWith('M5');
  });

  it('runs the job directly when homed (no warning shown)', () => {
    const onPrint = vi.fn();
    renderConsole({ isConnected: true, isHomed: true, onPrint, gcode: 'G28\nM3 S500' });
    fireEvent.click(screen.getByText('Run Job'));
    expect(onPrint).toHaveBeenCalled();
    expect(screen.queryByText(/should be homed/)).not.toBeInTheDocument();
  });

  it('shows the homing warning and does not run when not homed', () => {
    const onPrint = vi.fn();
    renderConsole({ isConnected: true, isHomed: false, onPrint, gcode: 'G28\nM3 S500' });
    fireEvent.click(screen.getByText('Run Job'));
    expect(onPrint).not.toHaveBeenCalled();
    expect(screen.getByText(/should be homed/)).toBeInTheDocument();
  });

  it('forwards XY jog keys to App (homing policy is enforced upstream)', () => {
    const onJogRelative = vi.fn();
    renderConsole({ isConnected: true, isHomed: false, onJogRelative });
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(onJogRelative).toHaveBeenCalledWith(0, 10);
  });

  it('shows Safe Z prompt after homing when zSecure is configured', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onHome = vi.fn();

    renderConsole({
      isConnected: true,
      isHomed: false,
      onSend,
      onHome,
      activeMachine: mockMachine, // Use the mockMachine which has zSecure: 5
    });

    // Trigger homing via the Home button
    fireEvent.click(screen.getByTitle('Home (H)'));

    // onHome callback should be called
    expect(onHome).toHaveBeenCalled();

    // Homing command should be sent
    expect(onSend).toHaveBeenCalledWith('G28');

    // Safe Z prompt should be visible after homing
    expect(screen.getByText(/Safe Z/i)).toBeInTheDocument();
  });

  it('moves to Safe Z when chosen from the prompt', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onHome = vi.fn();

    renderConsole({
      isConnected: true,
      isHomed: false,
      onSend,
      onHome,
      activeMachine: mockMachine, // Use the mockMachine which has zSecure: 5
    });

    // Trigger homing via the Home button
    fireEvent.click(screen.getByTitle('Home (H)'));

    // Safe Z prompt is shown
    expect(screen.getByText(/Safe Z/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Move to Safe Z/i));

    // Expect absolute positioning and move to safe Z height
    expect(onSend).toHaveBeenCalledWith('G90');
    expect(onSend).toHaveBeenCalledWith('G0 Z5 F4000');
  });

  it('skips Safe Z move when Skip is chosen from the prompt', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const onHome = vi.fn();

    renderConsole({
      isConnected: true,
      isHomed: false,
      onSend,
      onHome,
      activeMachine: mockMachine, // Use the mockMachine which has zSecure: 5
    });

    // Trigger homing via the Home button
    fireEvent.click(screen.getByTitle('Home (H)'));

    // Safe Z prompt is shown
    expect(screen.getByText(/Safe Z/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Skip/i));

    // Prompt should be dismissed
    expect(screen.queryByText(/Safe Z/i)).not.toBeInTheDocument();

    // No additional movement commands beyond homing should be sent
    const sendCommands = onSend.mock.calls.map(args => args[0]);
    expect(sendCommands.filter(cmd => cmd !== 'G28')).toHaveLength(0);
  });
});
