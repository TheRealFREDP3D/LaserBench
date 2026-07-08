import { create } from 'zustand';
import { PatternType } from '../types';

interface PatternState {
  selectedPattern: PatternType;
  powerMin: number;
  powerMax: number;
  speedMin: number;
  speedMax: number;
  powerSteps: number;
  speedSteps: number;
  blockSize: number;
  textSize: number;
  nominalThickness: number;
  kerfValues: number[];
  zMin: number;
  zMax: number;
  zSteps: number;
  patternPosition: { x: number; y: number };
  rasterStepover: number;

  setPatternType: (type: PatternType) => void;
  setPowerMin: (val: number) => void;
  setPowerMax: (val: number) => void;
  setSpeedMin: (val: number) => void;
  setSpeedMax: (val: number) => void;
  setPowerSteps: (val: number) => void;
  setSpeedSteps: (val: number) => void;
  setBlockSize: (val: number) => void;
  setTextSize: (val: number) => void;
  setNominalThickness: (val: number) => void;
  setKerfValues: (vals: number[]) => void;
  setZMin: (val: number) => void;
  setZMax: (val: number) => void;
  setZSteps: (val: number) => void;
  setPatternPosition: (pos: { x: number; y: number }) => void;
  setRasterStepover: (val: number) => void;
}

export const usePatternStore = create<PatternState>((set) => ({
  selectedPattern: 'matrix',
  powerMin: 50,
  powerMax: 255,
  speedMin: 500,
  speedMax: 3000,
  powerSteps: 5,
  speedSteps: 5,
  blockSize: 10,
  textSize: 4,
  nominalThickness: 3.0,
  kerfValues: [0.1, 0.15, 0.2, 0.25],
  zMin: 0,
  zMax: 5,
  zSteps: 5,
  patternPosition: { x: 0, y: 0 },
  rasterStepover: 0.2,

  setPatternType: (type) => set({ selectedPattern: type }),
  setPowerMin: (val) => set({ powerMin: Math.max(0, Math.round(val)) }),
  setPowerMax: (val) => set({ powerMax: Math.max(0, Math.round(val)) }),
  setSpeedMin: (val) => set({ speedMin: Math.max(1, Math.round(val)) }),
  setSpeedMax: (val) => set({ speedMax: Math.max(1, Math.round(val)) }),
  setPowerSteps: (val) => set({ powerSteps: Math.max(1, Math.round(val)) }),
  setSpeedSteps: (val) => set({ speedSteps: Math.max(1, Math.round(val)) }),
  setBlockSize: (val) => set({ blockSize: Math.max(1, Math.round(val)) }),
  setTextSize: (val) => set({ textSize: Math.max(1, Math.round(val)) }),
  setNominalThickness: (val) => set({ nominalThickness: Math.max(0.1, val) }),
  setKerfValues: (vals) => set({ kerfValues: vals.length > 0 ? vals : [0.1] }),
  setZMin: (val) => set({ zMin: val }),
  setZMax: (val) => set({ zMax: val }),
  setZSteps: (val) => set({ zSteps: Math.max(1, Math.round(val)) }),
  setRasterStepover: (val) => set({ rasterStepover: Math.max(0.01, val) }),
  setPatternPosition: (pos) =>
    set({
      patternPosition: {
        x: Number.isFinite(pos.x) ? pos.x : 0,
        y: Number.isFinite(pos.y) ? pos.y : 0,
      },
    }),
}));
