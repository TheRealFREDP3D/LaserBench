import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmModal from '../components/ConfirmModal';
import { ThemeProvider } from '../lib/themeContext';

function renderModal(overrides = {}) {
  const defaults = {
    open: true,
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(
    <ThemeProvider>
      <ConfirmModal {...defaults} {...overrides} />
    </ThemeProvider>
  );
}

describe('ConfirmModal', () => {
  it('renders when open', () => {
    renderModal();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderModal({ open: false });
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('renders Confirm and Cancel buttons', () => {
    renderModal();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when Confirm clicked', () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when clicking backdrop', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });
    fireEvent.click(screen.getByRole('alertdialog'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not close when clicking modal content', () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });
    fireEvent.click(screen.getByText('Are you sure?'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('renders danger message text', () => {
    renderModal({ message: 'Delete this item?' });
    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderModal();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
