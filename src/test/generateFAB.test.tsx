import {describe, expect, it, afterEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import fc from 'fast-check';
import GenerateFAB from '@/src/components/layout/GenerateFAB';

afterEach(() => {
  document.body.innerHTML = '';
});

// ─── Property 10: FAB enabled state mirrors generatedResults ──────

describe('Property 10: FAB enabled state mirrors generatedResults', () => {
  it('fc.property: aria-disabled equals (results === null).toString()', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.record({gcode: fc.string(), paths: fc.array(fc.anything())})),
        async (results) => {
          const disabled = results === null;
          const {unmount} = render(
            <GenerateFAB disabled={disabled} estimatedTimeStr={null} onClick={() => {}} />
          );
          const btn = screen.getByRole('button', {name: /generate/i});
          expect(btn.getAttribute('aria-disabled')).toBe(disabled.toString());
          unmount();
        }
      )
    );
  });
});

// ─── Property 11: FAB shows estimated time when available ─────────

describe('Property 11: FAB shows estimated time when available', () => {
  it('fc.property: time label present in DOM iff estimatedTimeStr !== null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({minLength: 1})),
        async (timeStr) => {
          const {unmount} = render(
            <GenerateFAB disabled={false} estimatedTimeStr={timeStr} onClick={() => {}} />
          );
          const label = screen.queryByTestId('fab-estimated-time');
          if (timeStr !== null) {
            expect(label).toBeInTheDocument();
          } else {
            expect(label).not.toBeInTheDocument();
          }
          unmount();
        }
      )
    );
  });
});
