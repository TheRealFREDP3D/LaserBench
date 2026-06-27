import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useConfirmModal, ConfirmSupersededError } from '../hooks/useConfirmModal';
import { ThemeProvider } from '../lib/themeContext';

function ConfirmTestComponent({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm, ConfirmModalComponent } = useConfirmModal();
  return (
    <div>
      {ConfirmModalComponent}
      <button
        onClick={async () => {
          const result = await confirm('Are you sure?');
          onResult(result);
        }}
      >
        Open
      </button>
    </div>
  );
}

function MultiConfirm({
  onResult1,
  onResult2,
}: {
  onResult1: (v: unknown) => void;
  onResult2: (v: unknown) => void;
}) {
  const { confirm, ConfirmModalComponent } = useConfirmModal();
  return (
    <div>
      {ConfirmModalComponent}
      <button
        onClick={() => {
          confirm('First').then(onResult1).catch(onResult1);
        }}
      >
        First
      </button>
      <button
        onClick={() => {
          confirm('Second').then(onResult2).catch(onResult2);
        }}
      >
        Second
      </button>
    </div>
  );
}

describe('useConfirmModal', () => {
  it('returns true when confirm is accepted', async () => {
    const onResult = vi.fn();
    render(
      <ThemeProvider>
        <ConfirmTestComponent onResult={onResult} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Are you sure?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('returns false when cancel is clicked', async () => {
    const onResult = vi.fn();
    render(
      <ThemeProvider>
        <ConfirmTestComponent onResult={onResult} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('Open'));
    await screen.findByText('Are you sure?');
    fireEvent.click(screen.getByText('Cancel'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('returns false when backdrop is clicked', async () => {
    const onResult = vi.fn();
    render(
      <ThemeProvider>
        <ConfirmTestComponent onResult={onResult} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText('Open'));
    await screen.findByText('Are you sure?');
    fireEvent.click(screen.getByRole('alertdialog'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onResult).toHaveBeenCalledWith(false);
  });

  it('rejects with ConfirmSupersededError when a new confirm supersedes', async () => {
    const onResult1 = vi.fn();
    const onResult2 = vi.fn();
    render(
      <ThemeProvider>
        <MultiConfirm onResult1={onResult1} onResult2={onResult2} />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onResult1).toHaveBeenCalledTimes(1);
    expect(onResult1.mock.calls[0][0]).toBeInstanceOf(ConfirmSupersededError);
  });
});
