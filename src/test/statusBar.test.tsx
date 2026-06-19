import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import StatusBar from '@/src/components/layout/StatusBar';

afterEach(() => {
  cleanup();
});

// ─── Property 14: Status bar completeness ─────────────────────────

describe('Property 14: Status bar completeness', () => {
  it('fc.property: all six indicator groups are present for any state combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'connected' | 'offline' | 'connecting'>('connected', 'offline', 'connecting'),
        fc.constantFrom('MyMachine', 'TestRig', 'Workstation', 'CNC-42', 'LabUnit'),
        fc.constantFrom('Plywood', 'Acrylic', 'MDF', 'Cardboard', 'Leather'),
        fc.option(fc.string({minLength: 1})),
        fc.boolean(),
        async (connState, machineName, materialName, timeStr, delta) => {
          try {
            render(
              <StatusBar
                isConnected={connState === 'connected'}
                connectionState={connState}
                machineName={machineName}
                firmware="grbl"
                materialName={materialName}
                estimatedTimeStr={timeStr}
                isDelta={delta}
                isPrinting={false}
                progress={0}
              />
            );

            expect(screen.getByTestId('connection-label')).toBeInTheDocument();
            expect(screen.getByTestId('machine-name')).toBeInTheDocument();
            expect(screen.getByTestId('firmware')).toHaveTextContent('GRBL');
            expect(screen.getByTestId('material-name')).toBeInTheDocument();

            const burnTime = screen.getByTestId('burn-time');
            if (timeStr !== null) {
              expect(burnTime.textContent).toContain(timeStr);
            } else {
              expect(burnTime).toHaveTextContent('—');
            }

            if (delta) {
              expect(screen.getByText('Δ')).toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      )
    );
  });
});

// ─── Property 15: Status bar connection display ───────────────────

describe('Property 15: Status bar connection display', () => {
  it('fc.property: label text and dot class match connection state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'connected' | 'offline' | 'connecting'>('connected', 'offline', 'connecting'),
        async (connState) => {
          try {
            render(
              <StatusBar
                isConnected={connState === 'connected'}
                connectionState={connState}
                machineName="Test"
                firmware="grbl"
                materialName="Wood"
                estimatedTimeStr={null}
                isDelta={false}
                isPrinting={false}
                progress={0}
              />
            );

            const label = screen.getByTestId('connection-label');
            expect(label).toHaveTextContent(
              connState === 'connected' ? 'CONNECTED' :
              connState === 'offline' ? 'OFFLINE' : 'CONNECTING'
            );

            const dot = label.querySelector('span');
            expect(dot).toBeInTheDocument();
            const dotClass = dot!.className;
            if (connState === 'connected') {
              expect(dotClass).toContain('bg-emerald-500');
              expect(dotClass).toContain('animate-pulse');
            } else if (connState === 'offline') {
              expect(dotClass).toContain('bg-zinc-500');
              expect(dotClass).not.toContain('animate-pulse');
            } else {
              expect(dotClass).toContain('bg-amber-400');
              expect(dotClass).toContain('animate-pulse');
            }
          } finally {
            cleanup();
          }
        }
      )
    );
  });
});

// ─── Property 16: Status bar print progress display ──────────────

describe('Property 16: Status bar print progress display', () => {
  it('fc.property: progress percentage shown iff printing with 0 < progress < 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.integer({min: 0, max: 100}),
        async (isPrinting, progress) => {
          try {
            render(
              <StatusBar
                isConnected={false}
                connectionState="offline"
                machineName="Test"
                firmware="grbl"
                materialName="Wood"
                estimatedTimeStr={null}
                isDelta={false}
                isPrinting={isPrinting}
                progress={progress}
              />
            );

            const shouldShowPercentage = isPrinting && progress > 0 && progress < 100;
            const shouldShowPrinting = isPrinting && (progress === 0 || progress === 100);
            const shouldShowNothing = !isPrinting;

            if (shouldShowPercentage) {
              expect(screen.getByText(`${progress}%`)).toBeInTheDocument();
            } else if (shouldShowPrinting) {
              expect(screen.getByText('PRINTING…')).toBeInTheDocument();
            } else {
              expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
              expect(screen.queryByText('PRINTING…')).not.toBeInTheDocument();
            }
          } finally {
            cleanup();
          }
        }
      )
    );
  });
});
