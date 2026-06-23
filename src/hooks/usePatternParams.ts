import { useState, useCallback, useEffect } from 'react';
import type { PatternType, GeneratorPreset } from '../types';

export interface PatternParams {
  selectedPattern: PatternType;
  powerMin: number;
  powerMax: number;
  speedMin: number;
  speedMax: number;
  powerSteps: number;
  speedSteps: number;
  blockSize: number;
  nominalThickness: number;
  kerfValues: number[];
  zMin: number;
  zMax: number;
  zSteps: number;
}

const STORAGE_KEY = 'laserbench_patternParams';

const DEFAULTS: PatternParams = {
  selectedPattern: 'matrix',
  powerMin: 50,
  powerMax: 255,
  speedMin: 500,
  speedMax: 2500,
  powerSteps: 5,
  speedSteps: 5,
  blockSize: 12,
  nominalThickness: 3.0,
  kerfValues: [0.05, 0.10, 0.15, 0.20, 0.25],
  zMin: 0,
  zMax: 0,
  zSteps: 5,
};

function loadFromStorage(): PatternParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      selectedPattern: parsed.selectedPattern ?? DEFAULTS.selectedPattern,
      powerMin: typeof parsed.powerMin === 'number' ? parsed.powerMin : DEFAULTS.powerMin,
      powerMax: typeof parsed.powerMax === 'number' ? parsed.powerMax : DEFAULTS.powerMax,
      speedMin: typeof parsed.speedMin === 'number' ? parsed.speedMin : DEFAULTS.speedMin,
      speedMax: typeof parsed.speedMax === 'number' ? parsed.speedMax : DEFAULTS.speedMax,
      powerSteps: typeof parsed.powerSteps === 'number' ? parsed.powerSteps : DEFAULTS.powerSteps,
      speedSteps: typeof parsed.speedSteps === 'number' ? parsed.speedSteps : DEFAULTS.speedSteps,
      blockSize: typeof parsed.blockSize === 'number' ? parsed.blockSize : DEFAULTS.blockSize,
      nominalThickness: typeof parsed.nominalThickness === 'number' ? parsed.nominalThickness : DEFAULTS.nominalThickness,
      kerfValues: Array.isArray(parsed.kerfValues) ? parsed.kerfValues : DEFAULTS.kerfValues,
      zMin: typeof parsed.zMin === 'number' ? parsed.zMin : DEFAULTS.zMin,
      zMax: typeof parsed.zMax === 'number' ? parsed.zMax : DEFAULTS.zMax,
      zSteps: typeof parsed.zSteps === 'number' ? parsed.zSteps : DEFAULTS.zSteps,
    };
  } catch {
    return DEFAULTS;
  }
}

export function usePatternParams() {
  const [stored, setStored] = useState<PatternParams>(loadFromStorage);

  const { selectedPattern, powerMin, powerMax, speedMin, speedMax, powerSteps, speedSteps, blockSize, nominalThickness, kerfValues, zMin, zMax, zSteps } = stored;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch { /* ignore quota errors */ }
  }, [stored]);

  const update = useCallback((patch: Partial<PatternParams>) => {
    setStored(prev => ({ ...prev, ...patch }));
  }, []);

  const loadPreset = useCallback((preset: GeneratorPreset) => {
    setStored({
      selectedPattern: preset.patternType,
      powerMin: preset.powerMin,
      powerMax: preset.powerMax,
      speedMin: preset.speedMin,
      speedMax: preset.speedMax,
      powerSteps: preset.powerSteps,
      speedSteps: preset.speedSteps,
      blockSize: preset.blockSize,
      nominalThickness: preset.nominalThickness,
      kerfValues: [...preset.kerfValues],
      zMin: preset.zMin,
      zMax: preset.zMax,
      zSteps: preset.zSteps,
    });
  }, []);

  return {
    selectedPattern, setSelectedPattern: (v: PatternType) => update({ selectedPattern: v }),
    powerMin, setPowerMin: (v: number) => update({ powerMin: v }),
    powerMax, setPowerMax: (v: number) => update({ powerMax: v }),
    speedMin, setSpeedMin: (v: number) => update({ speedMin: v }),
    speedMax, setSpeedMax: (v: number) => update({ speedMax: v }),
    powerSteps, setPowerSteps: (v: number) => update({ powerSteps: v }),
    speedSteps, setSpeedSteps: (v: number) => update({ speedSteps: v }),
    blockSize, setBlockSize: (v: number) => update({ blockSize: v }),
    nominalThickness, setNominalThickness: (v: number) => update({ nominalThickness: v }),
    kerfValues, setKerfValues: (v: number[]) => update({ kerfValues: v }),
    zMin, setZMin: (v: number) => update({ zMin: v }),
    zMax, setZMax: (v: number) => update({ zMax: v }),
    zSteps, setZSteps: (v: number) => update({ zSteps: v }),
    loadPreset,
  } as const;
}
