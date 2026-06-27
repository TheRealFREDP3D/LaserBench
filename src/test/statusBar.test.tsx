import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StatusBar from '../components/layout/StatusBar';

const defaultProps = {
  isConnected: false,
  machineName: 'Test Machine',
  firmware: 'grbl',
  materialName: 'Wood',
  estimatedTimeStr: null as string | null,
  isPrinting: false,
  progress: 0,
  movementMode: 'G90' as const,
  onConnect: vi.fn(),
  onDisconnect: vi.fn(),
};

describe('StatusBar', () => {
  it('renders disconnected state', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Test Machine')).toBeInTheDocument();
  });

  it('renders connected state', () => {
    render(<StatusBar {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows material name when connected', () => {
    render(<StatusBar {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Wood')).toBeInTheDocument();
  });

  it('shows firmware badge', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText('grbl')).toBeInTheDocument();
  });

  it('calls onConnect when clicking disconnected button', () => {
    const onConnect = vi.fn();
    render(<StatusBar {...defaultProps} onConnect={onConnect} />);
    fireEvent.click(screen.getByText('Disconnected'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onDisconnect when clicking connected button', () => {
    const onDisconnect = vi.fn();
    render(<StatusBar {...defaultProps} isConnected={true} onDisconnect={onDisconnect} />);
    fireEvent.click(screen.getByText('Connected'));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('shows printing progress', () => {
    render(<StatusBar {...defaultProps} isConnected={true} isPrinting={true} progress={42} />);
    expect(screen.getByText('Burning: 42%')).toBeInTheDocument();
  });

  it('does not show progress when not printing', () => {
    render(<StatusBar {...defaultProps} isConnected={true} isPrinting={false} />);
    expect(screen.queryByText(/Burning/)).not.toBeInTheDocument();
  });

  it('shows estimated time when provided', () => {
    render(<StatusBar {...defaultProps} estimatedTimeStr="2m 30s" />);
    expect(screen.getByText('Est: 2m 30s')).toBeInTheDocument();
  });

  it('does not show estimated time when null', () => {
    render(<StatusBar {...defaultProps} estimatedTimeStr={null} />);
    expect(screen.queryByText(/Est:/)).not.toBeInTheDocument();
  });

  it('shows movement mode when connected', () => {
    render(<StatusBar {...defaultProps} isConnected={true} movementMode="G90" />);
    expect(screen.getByText('Absolute')).toBeInTheDocument();
  });

  it('shows incremental mode when G91', () => {
    render(<StatusBar {...defaultProps} isConnected={true} movementMode="G91" />);
    expect(screen.getByText('Incremental')).toBeInTheDocument();
  });

  it('does not show movement mode when disconnected', () => {
    render(<StatusBar {...defaultProps} isConnected={false} />);
    expect(screen.queryByText('Absolute')).not.toBeInTheDocument();
    expect(screen.queryByText('Incremental')).not.toBeInTheDocument();
  });

  it('shows version', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
  });
});
