import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, useEffect, useRef } from 'react';

afterEach(() => {
  cleanup();
});

/**
 * Minimal harness replicating the preset flyout from App.tsx.
 * Tests toggle, outside-click, and keyboard shortcut behaviour.
 */
function PresetFlyoutHarness() {
  const [presetFlyoutOpen, setPresetFlyoutOpen] = useState(false);
  const presetFlyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!presetFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (presetFlyoutRef.current && !presetFlyoutRef.current.contains(e.target as Node)) {
        setPresetFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [presetFlyoutOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;
      if (e.key === '3' && presetFlyoutOpen) {
        setPresetFlyoutOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presetFlyoutOpen]);

  return (
    <div>
      <div className="relative" ref={presetFlyoutRef}>
        <button
          data-testid="load-preset-toggle"
          onClick={() => setPresetFlyoutOpen(!presetFlyoutOpen)}
          aria-expanded={presetFlyoutOpen}
        >
          Load Preset
        </button>
        {presetFlyoutOpen && (
          <div data-testid="preset-flyout" className="absolute right-0 top-full mt-1">
            <div className="p-2">
              <span>Preset content</span>
              <button data-testid="flyout-inner-btn">Inner action</button>
            </div>
          </div>
        )}
      </div>
      <div data-testid="outside-content">Main content</div>
    </div>
  );
}

describe('Preset flyout behaviour', () => {
  it('clicking Load Preset toggles flyout visibility', async () => {
    const user = userEvent.setup();
    render(<PresetFlyoutHarness />);

    // Initially hidden
    expect(screen.queryByTestId('preset-flyout')).not.toBeInTheDocument();

    // Open on first click
    await user.click(screen.getByTestId('load-preset-toggle'));
    expect(screen.getByTestId('preset-flyout')).toBeInTheDocument();

    // Close on second click
    await user.click(screen.getByTestId('load-preset-toggle'));
    expect(screen.queryByTestId('preset-flyout')).not.toBeInTheDocument();
  });

  it('pressing "3" closes the flyout when open', async () => {
    const user = userEvent.setup();
    render(<PresetFlyoutHarness />);

    // Open flyout
    await user.click(screen.getByTestId('load-preset-toggle'));
    expect(screen.getByTestId('preset-flyout')).toBeInTheDocument();

    // Press 3 to close
    await user.keyboard('3');
    expect(screen.queryByTestId('preset-flyout')).not.toBeInTheDocument();
  });

  it('clicking outside closes the flyout, clicking inside does not', async () => {
    const user = userEvent.setup();
    render(<PresetFlyoutHarness />);

    // Open flyout
    await user.click(screen.getByTestId('load-preset-toggle'));
    expect(screen.getByTestId('preset-flyout')).toBeInTheDocument();

    // Click inside — should remain open
    await user.click(screen.getByTestId('flyout-inner-btn'));
    expect(screen.getByTestId('preset-flyout')).toBeInTheDocument();

    // Click outside (on document body) — should close
    await user.click(document.body);
    expect(screen.queryByTestId('preset-flyout')).not.toBeInTheDocument();
  });
});
