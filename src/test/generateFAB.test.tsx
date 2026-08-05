import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import GenerateFAB from '@/src/components/layout/GenerateFAB';

afterEach(() => {
  cleanup();
});

// ─── Property 10: FAB enabled state mirrors generatedResults ──────

describe('Property 10: FAB enabled state mirrors generatedResults', () => {
  it('fc.property: aria-disabled equals (results === null).toString()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.record({ gcode: fc.string(), paths: fc.array(fc.anything()) })),
        async (results) => {
          const disabled = results === null;
          const { unmount } = render(
            <GenerateFAB disabled={disabled} estimatedTimeStr={null} onClick={() => {}} />
          );
          // The primary FAB is now labeled "Download G-Code" (renamed from "Generate")
          const btn = screen.getByRole('button', { name: /download/i });
          expect(btn.getAttribute('aria-disabled')).toBe(disabled.toString());
          unmount();
        }
      )
    );
  }, 15000);
});

// ─── Property 11: FAB shows estimated time when available ─────────

describe('Property 11: FAB shows estimated time when available', () => {
  it('fc.property: time label present in DOM iff estimatedTimeStr !== null', async () => {
    await fc.assert(
      fc.asyncProperty(fc.option(fc.string({ minLength: 1 })), async (timeStr) => {
        const { unmount } = render(
          <GenerateFAB disabled={false} estimatedTimeStr={timeStr} onClick={() => {}} />
        );
        const label = screen.queryByTestId('fab-estimated-time');
        if (timeStr !== null) {
          expect(label).toBeInTheDocument();
        } else {
          expect(label).not.toBeInTheDocument();
        }
        unmount();
      })
    );
  });
});

// ─── Property 12 (new): Secondary "Log Burn" button appears when onLogClick is provided ──

describe('Property 12: Secondary Log Burn button', () => {
  it('fc.property: Log Burn button is in the document iff onLogClick is provided', async () => {
    await fc.assert(
      fc.asyncProperty(fc.option(fc.constant(() => {})), async (onLogClick) => {
        const { unmount } = render(
          <GenerateFAB
            disabled={false}
            estimatedTimeStr={null}
            onClick={() => {}}
            onLogClick={onLogClick === null ? undefined : onLogClick}
          />
        );
        const logBtn = screen.queryByTestId('log-burn-fab');
        if (onLogClick === null) {
          expect(logBtn).not.toBeInTheDocument();
        } else {
          expect(logBtn).toBeInTheDocument();
        }
        unmount();
      })
    );
  });

  it('Log Burn button aria-disabled matches logDisabled prop', () => {
    const { rerender } = render(
      <GenerateFAB
        disabled={false}
        estimatedTimeStr={null}
        onClick={() => {}}
        onLogClick={() => {}}
        logDisabled={true}
      />
    );
    expect(screen.getByTestId('log-burn-fab').getAttribute('aria-disabled')).toBe('true');

    rerender(
      <GenerateFAB
        disabled={false}
        estimatedTimeStr={null}
        onClick={() => {}}
        onLogClick={() => {}}
        logDisabled={false}
      />
    );
    expect(screen.getByTestId('log-burn-fab').getAttribute('aria-disabled')).toBe('false');
  });
});
