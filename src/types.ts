export type FirmwareType = 'marlin' | 'grbl';

export interface MachineProfile {
  id: string;
  name: string;
  firmware: FirmwareType;
  laserOn: string;  // e.g. "M106 S{power}" or "M3 S{power}"
  laserOff: string; // e.g. "M107" or "M5"
  pwmMax: number;   // e.g. 255 or 1000
  safeZ: number;    // e.g. 0
  workZ: number;    // e.g. -40
  travelSpeed: number; // e.g. 6000 mm/min
  bedShape: 'circular' | 'rectangular';
  bedWidth: number;   // e.g. 200 for rectangular, radius for circular
  bedHeight: number;  // e.g. 200 for rectangular
  originX?: number;   // default 0 (origin X placement relative to bottom-left)
  originY?: number;   // default 0 (origin Y placement relative to bottom-left)
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
  thickness: number; // in mm
  laser: string;     // e.g. "5W Diode"
  focusZ: number;    // default focus Z
  engrave: {
    power: number;   // 0 - PWM Max
    speed: number;   // mm/min
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
  power?: number; // specific power if lasers on, undefined if travel
  speed?: number; // feed rate
}

export type PatternType = 'power_ramp' | 'speed_ramp' | 'matrix' | 'focus_ladder' | 'kerf_test';

export interface GeneratorPreset {
  id: string;
  name: string;
  patternType: PatternType;
  description?: string;
  isCustom?: boolean; // true if custom user-saved, false if built-in
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
