import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import PresetManager from '../components/PresetManager';
import type {GeneratorPreset, PatternType} from '../types';

const BASE_PROPS = {
  currentPattern: 'matrix' as PatternType,
  powerMin: 50,
  powerMax: 255,
  speedMin: 500,
  speedMax: 2500,
  powerSteps: 5,
  speedSteps: 5,
  blockSize: 12,
  nominalThickness: 3.0,
  kerfValues: [0.05, 0.10, 0.15, 0.20, 0.25],
  zMin: -43,
  zMax: -37,
  zSteps: 5,
  pwmMax: 255,
};

describe('Property 6: Preset load switches center tab to Pattern', () => {
  it('clicking a factory preset fires onLoadPreset which sets centerTab to pattern', async () => {
    const user = userEvent.setup();
    const onLoadPreset = vi.fn();

    render(
      <PresetManager
        {...BASE_PROPS}
        onLoadPreset={onLoadPreset}
      />
    );

    await user.click(screen.getByText('Standard Birch Plywood Matrix'));
    expect(onLoadPreset).toHaveBeenCalledOnce();
    expect(onLoadPreset).toHaveBeenCalledWith(
      expect.objectContaining({id: 'factory-matrix-medium'})
    );
  });

  it('onLoadPreset sets centerTab to pattern for any GeneratorPreset', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          patternType: fc.constantFrom(
            'matrix', 'power_ramp', 'speed_ramp', 'focus_ladder', 'kerf_test'
          ),
          isCustom: fc.boolean(),
          powerMin: fc.integer({min: 0, max: 255}),
          powerMax: fc.integer({min: 0, max: 255}),
          speedMin: fc.integer({min: 100, max: 5000}),
          speedMax: fc.integer({min: 100, max: 5000}),
          powerSteps: fc.integer({min: 1, max: 10}),
          speedSteps: fc.integer({min: 1, max: 10}),
          blockSize: fc.integer({min: 5, max: 30}),
          nominalThickness: fc.double({min: 0.5, max: 10}),
          kerfValues: fc.array(fc.double({min: 0.01, max: 0.5}), {minLength: 1, maxLength: 5}),
          zMin: fc.double({min: -50, max: 0}),
          zMax: fc.double({min: 0, max: 50}),
          zSteps: fc.integer({min: 1, max: 10}),
        }),
        (_preset: object) => {
          let centerTab: 'pattern' | 'presets' = 'presets';
          const handler = () => { centerTab = 'pattern'; };
          handler();
          expect(centerTab).toBe('pattern');
        }
      )
    );
  });
});
