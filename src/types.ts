export type FirmwareType = 'marlin' | 'marlin_v1' | 'grbl';

export interface MachineProfile {
  id: string;
  name: string;
  firmware: FirmwareType;
  laserOn: string;
  laserOff: string;
  pwmMax: number;
  safeZ: number;
  workZ: number;
  travelSpeed: number;
  bedShape: 'circular' | 'rectangular';
  bedWidth: number;
  bedHeight: number;
  originX?: number;
  originY?: number;
  acceleration?: number;
  // Serial communication
  baudRate: number;
  // Delta kinematics
  isDelta?: boolean;
  deltaRadius?: number;        // mm, horizontal center-to-tower distance
  deltaArmLength?: number;     // mm, diagonal arm length
  deltaRodLength?: number;     // mm, effective rod length
  deltaTowerAngleOffset?: number; // degrees
  deltaPrintRadius?: number;   // mm, max reachable radius from center
}

export type MaterialCategory = 'Wood' | 'Plastics' | 'Leather' | 'Stone' | 'Metals' | 'Paper/Cardboard' | 'Other';

export interface CalibrationHistoryEntry {
  id: string;
  date: string;
  patternType: string;
  optimalPower?: number;
  optimalSpeed?: number;
  optimalFocusZ?: number;
  notes: string;
}

export interface MaterialProfile {
  id: string;
  name: string;
  category: MaterialCategory;
  thickness: number;
  laser: string;
  focusZ?: number;
  engrave: {
    power: number;
    speed: number;
  };
  cut: {
    power: number;
    speed: number;
  };
  history: CalibrationHistoryEntry[];
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface PathElement {
  type: 'move' | 'line';
  x: number;
  y: number;
  power?: number;
  speed?: number;
}

export type PatternType = 'power_ramp' | 'speed_ramp' | 'matrix' | 'focus_ladder' | 'kerf_test';

export interface GeneratorPreset {
  id: string;
  name: string;
  patternType: PatternType;
  description?: string;
  isCustom?: boolean;
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

export interface Pattern {
  type: PatternType;
  name: string;
  description: string;
}
