import {describe, expect, it, afterEach} from 'vitest';
import {useState} from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import MaterialDatabase from '@/src/components/MaterialDatabase';
import {ThemeProvider} from '@/src/lib/themeContext';
import type {MaterialProfile, MaterialCategory} from '@/src/types';

afterEach(() => {
  cleanup();
});

const emptyHandlers = {
  onUpdateMaterial: () => {},
  onCreateMaterial: () => {},
  onDeleteMaterial: () => {},
};

const baseMaterial: MaterialProfile = {
  id: 'mat-1',
  name: 'Test Plywood',
  category: 'Wood' as MaterialCategory,
  thickness: 3.0,
  laser: '5W Diode',
  focusZ: -40.0,
  engrave: {power: 500, speed: 1500},
  cut: {power: 1000, speed: 150},
  history: [],
};

const wood2: MaterialProfile = {
  ...baseMaterial,
  id: 'mat-1b',
  name: 'Birch Plywood',
  thickness: 6.0,
};

const wood3: MaterialProfile = {
  ...baseMaterial,
  id: 'mat-1c',
  name: 'Oak Plywood',
  engrave: {power: 400, speed: 1200},
};

const altMaterial: MaterialProfile = {
  id: 'mat-2',
  name: 'Test Acrylic',
  category: 'Plastics' as MaterialCategory,
  thickness: 5.0,
  laser: '10W Diode',
  focusZ: -35.0,
  engrave: {power: 300, speed: 2000},
  cut: {power: 800, speed: 100},
  history: [],
};

// Stateful wrapper to re-render when selectedMaterialId changes
function TestHarness({
  materials,
  initialId,
}: {
  materials: MaterialProfile[];
  initialId: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId);
  return (
    <ThemeProvider>
      <MaterialDatabase
        materials={materials}
        selectedMaterialId={selectedId}
        onSelectMaterial={setSelectedId}
        pwmMax={1000}
        {...emptyHandlers}
      />
    </ThemeProvider>
  );
}

// ─── Property 12: Summary row completeness ──────────────────────────

describe('Property 12: MaterialDatabase summary row completeness', () => {
  it('fc.property: all eight values are present in the summary row for any material profile', async () => {
    const cat = 'Wood' as MaterialCategory;
    await fc.assert(
      fc.asyncProperty(
        fc.string({minLength: 1}),
        fc.double({min: 0.1, max: 50, noNaN: true}),
        fc.double({min: -50, max: 0, noNaN: true}),
        fc.string({minLength: 1}),
        fc.integer({min: 0, max: 1000}),
        fc.integer({min: 1, max: 10000}),
        fc.integer({min: 0, max: 1000}),
        fc.integer({min: 1, max: 10000}),
        async (name, thickness, focusZ, laser, engPower, engSpeed, cutPower, cutSpeed) => {
          try {
            const mat: MaterialProfile = {
              id: `prop-test-${Date.now()}`,
              name,
              category: cat,
              thickness,
              laser,
              focusZ,
              engrave: {power: engPower, speed: engSpeed},
              cut: {power: cutPower, speed: cutSpeed},
              history: [],
            };

            render(
              <ThemeProvider>
                <MaterialDatabase
                  materials={[mat]}
                  selectedMaterialId={mat.id}
                  pwmMax={1000}
                  onSelectMaterial={() => {}}
                  {...emptyHandlers}
                />
              </ThemeProvider>
            );

            const summary = screen.getByTestId('material-summary');
            expect(summary.textContent).toContain(name);
            expect(summary.textContent).toContain(String(thickness));
            expect(summary.textContent).toContain(String(focusZ));
            expect(summary.textContent).toContain(laser);
            expect(summary.textContent).toContain(String(engPower));
            expect(summary.textContent).toContain(String(engSpeed));
            expect(summary.textContent).toContain(String(cutPower));
            expect(summary.textContent).toContain(String(cutSpeed));
          } finally {
            cleanup();
          }
        }
      )
    );
  });
});

// ─── Property 13: Material selection updates summary immediately ────

describe('Property 13: Material selection updates summary immediately', () => {
  it('selecting a different material updates the summary row in the same render', () => {
    render(
      <TestHarness
        materials={[baseMaterial, wood2, wood3]}
        initialId={baseMaterial.id}
      />
    );

    expect(screen.getByTestId('material-summary').textContent).toContain('Test Plywood');

    fireEvent.click(screen.getByText('Birch Plywood'));
    expect(screen.getByTestId('material-summary').textContent).toContain('Birch Plywood');
    expect(screen.getByTestId('material-summary').textContent).toContain('6');

    fireEvent.click(screen.getByText('Oak Plywood'));
    expect(screen.getByTestId('material-summary').textContent).toContain('Oak Plywood');
    expect(screen.getByTestId('material-summary').textContent).toContain('400');
    expect(screen.getByTestId('material-summary').textContent).toContain('1200');
  });

  it('summary row reflects same material selected via category switch', () => {
    render(
      <TestHarness
        materials={[baseMaterial, altMaterial]}
        initialId={baseMaterial.id}
      />
    );

    expect(screen.getByTestId('material-summary').textContent).toContain('Test Plywood');

    fireEvent.click(screen.getByRole('button', {name: 'Plastics'}));
    expect(screen.getByTestId('material-summary').textContent).toContain('Test Acrylic');
  });
});
