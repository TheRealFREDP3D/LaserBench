import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MainCanvas from '../components/layout/MainCanvas';

describe('MainCanvas', () => {
  it('renders tabs correctly', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={false} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Operate')).toBeInTheDocument();
  });
});
