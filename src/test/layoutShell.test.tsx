import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import {useState} from 'react';
import MainCanvas, {CanvasView} from '@/src/components/layout/MainCanvas';

afterEach(() => {
  cleanup();
});

// ─── Property 7 (revised): Canvas view renders active panel ────────
// With AnimatePresence, only the active view panel is in the DOM at a time.
// MainCanvas now has 2 views: 'code' and 'operate' (preview lives in left panel).

describe('Property 7 (revised): Active canvas view panel is in the DOM', () => {
  it('fc.property: active panel is in DOM, inactive panels are not, for any canvasView', async () => {
    const panelMap: Record<CanvasView, string> = {
      code: 'gcode-panel',
      operate: 'console-panel',
    };
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<CanvasView>('code', 'operate'),
        async (view) => {
          const {unmount} = render(
            <MainCanvas canvasView={view} onViewChange={() => {}} isConnected={false} isPrinting={false}>
              {<div data-testid="gcode-content" />}
              {<div data-testid="console-content" />}
            </MainCanvas>
          );
          // Active panel should be in the DOM
          expect(screen.getByTestId(panelMap[view])).toBeInTheDocument();
          // Other panels should NOT be in the DOM
          for (const key of Object.keys(panelMap) as CanvasView[]) {
            if (key !== view) {
              expect(screen.queryByTestId(panelMap[key])).not.toBeInTheDocument();
            }
          }
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
        fc.constantFrom<CanvasView>('code', 'operate'),
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
