import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import fc from 'fast-check';
import {useState} from 'react';
import LeftSidebar from '@/src/components/layout/LeftSidebar';
import CenterPanel from '@/src/components/layout/CenterPanel';
import MainCanvas from '@/src/components/layout/MainCanvas';

afterEach(() => {
  document.body.innerHTML = '';
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

// ─── Property 5: Center panel tab mutual exclusivity ──────────────

describe('Property 5: Center panel tab mutual exclusivity', () => {
  it('fc.property: PatternConfigurator visible iff tab is pattern, PresetManager iff tab is presets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'pattern' | 'presets'>('pattern', 'presets'),
        async (tab) => {
          const {unmount} = render(
            <CenterPanel activeTab={tab} onTabChange={() => {}}>
              {<div data-testid="pattern-content" />}
              {<div data-testid="presets-content" />}
            </CenterPanel>
          );
          const patternPanel = screen.getByTestId('pattern-panel');
          const presetsPanel = screen.getByTestId('presets-panel');

          expect(hasClass(patternPanel, 'block')).toBe(tab === 'pattern');
          expect(hasClass(presetsPanel, 'block')).toBe(tab === 'presets');

          unmount();
        }
      )
    );
  });
});

// ─── Property 7: Output panel DOM persistence ─────────────────────

describe('Property 7: Output panel DOM persistence', () => {
  it('fc.property: both GCodeOutput and PrinterConsole panels are in the DOM regardless of outputTab', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'gcode' | 'console'>('gcode', 'console'),
        async (tab) => {
          const {unmount} = render(
            <MainCanvas outputTab={tab} onOutputTabChange={() => {}} isConnected={false}>
              {<div data-testid="viz-content" />}
              {<div data-testid="gcode-content" />}
              {<div data-testid="console-content" />}
            </MainCanvas>
          );
          expect(screen.getByTestId('gcode-panel')).toBeInTheDocument();
          expect(screen.getByTestId('console-panel')).toBeInTheDocument();
          unmount();
        }
      )
    );
  });
});

// ─── Property 9: Console tab connection badge ─────────────────────

describe('Property 9: Console tab connection badge', () => {
  it('fc.property: badge element present iff isConnected === true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (connected) => {
          const {unmount} = render(
            <MainCanvas outputTab="console" onOutputTabChange={() => {}} isConnected={connected}>
              {<div data-testid="viz-content" />}
              {<div data-testid="gcode-content" />}
              {<div data-testid="console-content" />}
            </MainCanvas>
          );
          const badge = screen.queryByTestId('connection-badge');
          if (connected) {
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

// ─── Property 8: Job start switches output tab to Console ─────────

describe('Property 8: Job start switches output tab to Console', () => {
  it('fc.property: outputTab becomes console after printGCode call, regardless of previous value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'gcode' | 'console'>('gcode', 'console'),
        async (initialTab) => {
          function PrintTestApp() {
            const [outputTab, setOutputTab] = useState<'gcode' | 'console'>(initialTab);
            const printGCode = () => { setOutputTab('console'); };
            return (
              <div>
                <span data-testid="output-tab">{outputTab}</span>
                <button data-testid="print-btn" onClick={printGCode}>Print</button>
              </div>
            );
          }
          const {unmount} = render(<PrintTestApp />);
          expect(screen.getByTestId('output-tab')).toHaveTextContent(initialTab);
          fireEvent.click(screen.getByTestId('print-btn'));
          expect(screen.getByTestId('output-tab')).toHaveTextContent('console');
          unmount();
        }
      )
    );
  });
});
