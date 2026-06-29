import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

  it('calls onViewChange when clicking a tab', () => {
    const onViewChange = vi.fn();
    render(
      <MainCanvas
        canvasView="code"
        onViewChange={onViewChange}
        isConnected={false}
        isPrinting={false}
      >
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    fireEvent.click(screen.getByTestId('view-tab-operate'));
    expect(onViewChange).toHaveBeenCalledWith('operate');
  });

  it('sets aria-selected on active tab', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={false} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    expect(screen.getByTestId('view-tab-code')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('view-tab-operate')).toHaveAttribute('aria-selected', 'false');
  });

  it('shows connection badge on Operate tab when connected', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={true} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    expect(screen.getByTestId('connection-badge')).toBeInTheDocument();
  });

  it('shows amber badge when printing', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={true} isPrinting={true}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    const badge = screen.getByTestId('connection-badge');
    expect(badge).toHaveClass('bg-amber-500');
    expect(badge).toHaveAttribute('title', 'Print in progress');
  });

  it('shows emerald badge when connected but not printing', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={true} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    const badge = screen.getByTestId('connection-badge');
    expect(badge).toHaveClass('bg-emerald-500');
    expect(badge).toHaveAttribute('title', 'Printer connected');
  });

  it('hides connection badge when disconnected', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={false} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    expect(screen.queryByTestId('connection-badge')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <MainCanvas canvasView="code" onViewChange={() => {}} isConnected={false} isPrinting={false}>
        <div>Code Content</div>
        <div>Operate Content</div>
      </MainCanvas>
    );
    expect(screen.getByText('Code Content')).toBeInTheDocument();
    expect(screen.getByText('Operate Content')).toBeInTheDocument();
  });
});
