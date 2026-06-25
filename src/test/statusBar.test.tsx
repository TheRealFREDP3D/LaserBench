import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBar from '../components/layout/StatusBar';

describe('StatusBar', () => {
  it('renders disconnected state', () => {
    render(
      <StatusBar
        isConnected={false}
        connectionState="disconnected"
        machineName="Test Machine"
        firmware="grbl"
        materialName="Wood"
        estimatedTimeStr="2m 30s"
        isDelta={false}
        isPrinting={false}
        progress={0}
        movementMode="G90"
        onConnect={() => {}}
        onDisconnect={() => {}}
      />
    );
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Test Machine')).toBeInTheDocument();
  });
});
