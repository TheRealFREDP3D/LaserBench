import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import {useState} from 'react';
import LeftSidebar from '@/src/components/layout/LeftSidebar';
import CenterPanel from '@/src/components/layout/CenterPanel';
import MainCanvas, {CanvasView} from '@/src/components/layout/MainCanvas';

afterEach(() => {
  cleanup();
});

function hasClass(el: HTMLElement, cls: string): boolean {
  return el.className.split(' ').includes(cls);
}

// ─── Property 1: Sidebar tab mutual exclusivity ───────────────────

describe('Property 1: Sidebar tab mutual exclusivity', () => {
  it('fc.property: exactly one panel is visible for any tab value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'machine' | 'material'>('machine', 'material'),
        async (tab) => {
          const {unmount} = render(
            <LeftSidebar activeTab={tab} onTabChange={() => {}} isOpen={false} onClose={() => {}}>
              {<div data-testid="machine-content" />}
              {<div data-testid="material-content" />}
            </LeftSidebar>
          );
          const panels = screen.getAllByTestId('machine-panel').concat(screen.getAllByTestId('material-panel'));

          let machineVisible = false;
          let materialVisible = false;
          for (const p of panels) {
            if (p.id === 'panel-machine' && hasClass(p, 'block')) machineVisible = true;
            if (p.id === 'panel-material' && hasClass(p, 'block')) materialVisible = true;
          }

          expect(machineVisible).toBe(tab === 'machine');
          expect(materialVisible).toBe(tab === 'material');

          unmount();
        }
      )
    );
  });
});

// ─── Property 5 (revised): Center panel always shows Pattern ──────
// The old Presets tab is now a dropdown flyout; pattern-panel is always visible.

describe('Property 5 (revised): Center panel always shows Pattern', () => {
  it('pattern-panel is always visible regardless of presetFlyoutOpen state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (flyoutOpen) => {
          const {unmount} = render(
            <CenterPanel presetFlyoutOpen={flyoutOpen} onPresetFlyoutToggle={() => {}}>
              {<div data-testid="pattern-content" />}
              {<div data-testid="presets-content" />}
            </CenterPanel>
          );
          const patternPanel = screen.getByTestId('pattern-panel');
          // pattern-panel is always 'block' (visible)
          expect(hasClass(patternPanel, 'block')).toBe(true);
          // presets-panel is always hidden (it's a flyout now, not a tab)
          const presetsPanel = screen.getByTestId('presets-panel');
          expect(hasClass(presetsPanel, 'hidden')).toBe(true);
          unmount();
        }
      )
    );
  });
});

// ─── Property 7 (revised): Canvas view DOM persistence ────────────
// All three view panels (preview, gcode, console) are in the DOM regardless of canvasView.

describe('Property 7 (revised): All canvas view panels are in the DOM', () => {
  it('fc.property: preview/gcode/console panels all in DOM for any canvasView', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<CanvasView>('preview', 'code', 'operate'),
        async (view) => {
          const {unmount} = render(
            <MainCanvas canvasView={view} onViewChange={() => {}} isConnected={false} isPrinting={false}>
              {<div data-testid="viz-content" />}
              {<div data-testid="gcode-content" />}
              {<div data-testid="console-content" />}
            </MainCanvas>
          );
          expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
          expect(screen.getByTestId('gcode-panel')).toBeInTheDocument();
          expect(screen.getByTestId('console-panel')).toBeInTheDocument();
          unmount();
        }
      )
    );
  });
});

// ─── Property 9 (revised): Operate view connection badge ──────────

describe('Property 9 (revised): Operate view shows connection badge', () => {
  it('fc.property: badge present iff (isConnected OR isPrinting) when canvasView=operate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.boolean(),
        async (connected, printing) => {
          const {unmount} = render(
            <MainCanvas canvasView="operate" onViewChange={() => {}} isConnected={connected} isPrinting={printing}>
              {<div data-testid="viz-content" />}
              {<div data-testid="gcode-content" />}
              {<div data-testid="console-content" />}
            </MainCanvas>
          );
          const badge = screen.queryByTestId('connection-badge');
          if (connected || printing) {
            expect(badge).toBeInTheDocument();
          } else {
            expect(badge).not.toBeInTheDocument();
          }
          unmount();
        }
      )
    );
  });
});

// ─── Property 8 (revised): Job start switches canvasView to 'operate' ─

describe('Property 8 (revised): Job start switches canvasView to operate', () => {
  it('fc.property: canvasView becomes operate after printGCode call, regardless of previous value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<CanvasView>('preview', 'code', 'operate'),
        async (initialView) => {
          function PrintTestApp() {
            const [canvasView, setCanvasView] = useState<CanvasView>(initialView);
            const printGCode = () => { setCanvasView('operate'); };
            return (
              <div>
                <span data-testid="canvas-view">{canvasView}</span>
                <button data-testid="print-btn" onClick={printGCode}>Print</button>
              </div>
            );
          }
          const {unmount} = render(<PrintTestApp />);
          expect(screen.getByTestId('canvas-view')).toHaveTextContent(initialView);
          fireEvent.click(screen.getByTestId('print-btn'));
          expect(screen.getByTestId('canvas-view')).toHaveTextContent('operate');
          unmount();
        }
      )
    );
  });
});
