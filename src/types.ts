export type FirmwareType = 'marlin' | 'grbl';
export type LaserControlMode = 'M3_M5' | 'M106_M107' | 'M3_M4_M5';

export interface MachineProfile {
  id: string;
  name: string;
  firmware: FirmwareType;
  laserMode: LaserControlMode;
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
  startGCode?: string;
  endGCode?: string;
  baudRate: number;
  isDelta?: boolean;
  deltaRadius?: number;
  deltaArmLength?: number;
  deltaRodLength?: number;
  deltaTowerAngleOffset?: number;
  deltaPrintRadius?: number;
}

export type MaterialCategory =
  | 'Wood'
  | 'Plastics'
  | 'Leather'
  | 'Stone'
  | 'Metals'
  | 'Paper/Cardboard'
  | 'Other';

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

export interface PathSegment {
  points: [number, number][];
  power: number;
  speed: number;
  z: number;
  isLaserOn: boolean;
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

export interface SvgPathElement {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
  strokeLinecap: string;
  strokeLinejoin?: string;
}

export interface GeneratedData {
  gcode: string;
  svgPaths: SvgPathElement[];
  paths: PathSegment[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  deltaWarnings?: string[];
}

export interface Pattern {
  type: PatternType;
  name: string;
  description: string;
}
