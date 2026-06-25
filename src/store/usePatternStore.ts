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

  // Validation checks for "green lights"
  isMachineStepComplete: boolean;
  isMaterialStepComplete: boolean;
  isPatternStepComplete: boolean;
  setStepComplete: (step: 'machine' | 'material' | 'pattern', complete: boolean) => void;
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

  isMachineStepComplete: true, // Defaults to true since we have initial machines
  isMaterialStepComplete: true,
  isPatternStepComplete: false,

  setPatternType: (type) => set({ selectedPattern: type }),
  setPowerMin: (val) => set({ powerMin: val }),
  setPowerMax: (val) => set({ powerMax: val }),
  setSpeedMin: (val) => set({ speedMin: val }),
  setSpeedMax: (val) => set({ speedMax: val }),
  setPowerSteps: (val) => set({ powerSteps: val }),
  setSpeedSteps: (val) => set({ speedSteps: val }),
  setBlockSize: (val) => set({ blockSize: val }),
  setTextSize: (val) => set({ textSize: val }),
  setNominalThickness: (val) => set({ nominalThickness: val }),
  setKerfValues: (vals) => set({ kerfValues: vals }),
  setZMin: (val) => set({ zMin: val }),
  setZMax: (val) => set({ zMax: val }),
  setZSteps: (val) => set({ zSteps: val }),
  setPatternPosition: (pos) => set({ patternPosition: pos }),
  setStepComplete: (step, complete) =>
    set((state) => ({
      ...state,
      [`is${step.charAt(0).toUpperCase() + step.slice(1)}StepComplete`]: complete,
    })),
}));
