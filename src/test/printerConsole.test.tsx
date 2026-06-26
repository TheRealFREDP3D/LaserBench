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
  safeZ: 5,
  workZ: 0,
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
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
  onSend: vi.fn(),
  onClear: vi.fn(),
  onAbortPrint: vi.fn(),
  onJogRelative: vi.fn(),
  activeMachine: mockMachine,
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
});
