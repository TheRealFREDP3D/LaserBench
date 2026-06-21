import { useState, useCallback } from 'react';
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

export function usePatternParams() {
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('matrix');
  const [powerMin, setPowerMin] = useState(50);
  const [powerMax, setPowerMax] = useState(255);
  const [speedMin, setSpeedMin] = useState(500);
  const [speedMax, setSpeedMax] = useState(2500);
  const [powerSteps, setPowerSteps] = useState(5);
  const [speedSteps, setSpeedSteps] = useState(5);
  const [blockSize, setBlockSize] = useState(12);
  const [nominalThickness, setNominalThickness] = useState(3.0);
  const [kerfValues, setKerfValues] = useState<number[]>([0.05, 0.10, 0.15, 0.20, 0.25]);
  const [zMin, setZMin] = useState(0);
  const [zMax, setZMax] = useState(0);
  const [zSteps, setZSteps] = useState(5);

  const loadPreset = useCallback((preset: GeneratorPreset) => {
    setSelectedPattern(preset.patternType);
    setPowerMin(preset.powerMin);
    setPowerMax(preset.powerMax);
    setSpeedMin(preset.speedMin);
    setSpeedMax(preset.speedMax);
    setPowerSteps(preset.powerSteps);
    setSpeedSteps(preset.speedSteps);
    setBlockSize(preset.blockSize);
    setNominalThickness(preset.nominalThickness);
    setKerfValues([...preset.kerfValues]);
    setZMin(preset.zMin);
    setZMax(preset.zMax);
    setZSteps(preset.zSteps);
  }, []);

  return {
    selectedPattern, setSelectedPattern,
    powerMin, setPowerMin,
    powerMax, setPowerMax,
    speedMin, setSpeedMin,
    speedMax, setSpeedMax,
    powerSteps, setPowerSteps,
    speedSteps, setSpeedSteps,
    blockSize, setBlockSize,
    nominalThickness, setNominalThickness,
    kerfValues, setKerfValues,
    zMin, setZMin,
    zMax, setZMax,
    zSteps, setZSteps,
    loadPreset,
  } as const;
}
