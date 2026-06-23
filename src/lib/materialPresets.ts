import { MachineProfile, MaterialProfile } from '../types';

function isValidMachineProfile(m: unknown): m is MachineProfile {
  if (typeof m !== 'object' || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.firmware === 'string' &&
    typeof obj.laserOn === 'string' &&
    typeof obj.laserOff === 'string' &&
    typeof obj.pwmMax === 'number' &&
    typeof obj.safeZ === 'number' &&
    typeof obj.workZ === 'number' &&
    typeof obj.travelSpeed === 'number' &&
    typeof obj.bedShape === 'string' &&
    typeof obj.bedWidth === 'number' &&
    typeof obj.bedHeight === 'number' &&
    typeof obj.baudRate === 'number'
  );
}

function isValidMaterialProfile(m: unknown): m is MaterialProfile {
  if (typeof m !== 'object' || m === null) return false;
  const obj = m as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    typeof obj.name !== 'string' ||
    typeof obj.category !== 'string' ||
    typeof obj.thickness !== 'number' ||
    typeof obj.laser !== 'string' ||
    typeof obj.engrave !== 'object' || obj.engrave === null ||
    typeof obj.cut !== 'object' || obj.cut === null ||
    !Array.isArray(obj.history)
  ) return false;
  const engrave = obj.engrave as Record<string, unknown>;
  const cut = obj.cut as Record<string, unknown>;
  return (
    typeof engrave.power === 'number' &&
    typeof engrave.speed === 'number' &&
    typeof cut.power === 'number' &&
    typeof cut.speed === 'number'
  );
}

export const INITIAL_MACHINES: MachineProfile[] = [
  {
    id: 'flsun_kossel',
    name: 'FLSUN Kossel Laser (Delta)',
    firmware: 'marlin',
    baudRate: 250000,
    laserOn: 'M106 S{power}',
    laserOff: 'M107',
    pwmMax: 255,
    safeZ: 0,
    workZ: 0,
    travelSpeed: 6000,
    bedShape: 'circular',
    bedWidth: 90,
    bedHeight: 0,
    originX: 0,
    originY: 0,
    acceleration: 1200,
    // Delta kinematics — FLSun Kossel Mini defaults
    isDelta: true,
    deltaRadius: 105.6,
    deltaArmLength: 217.0,
    deltaRodLength: 217.0,
    deltaTowerAngleOffset: 0,
    deltaPrintRadius: 85,
  },
  {
    id: 'grbl_generic',
    name: 'Generic GRBL Engraver',
    firmware: 'grbl',
    baudRate: 250000,
    laserOn: 'M3 S{power}',
    laserOff: 'M5',
    pwmMax: 1000,
    safeZ: 5,
    workZ: 0,
    travelSpeed: 4000,
    bedShape: 'rectangular',
    bedWidth: 300,
    bedHeight: 180,
    originX: 0,
    originY: 0,
    acceleration: 1000,
    isDelta: false,
  },
  {
    id: 'xtool_d1_pro',
    name: 'xTool D1 Pro (20W)',
    firmware: 'grbl',
    baudRate: 250000,
    laserOn: 'M3 S{power}',
    laserOff: 'M5',
    pwmMax: 1000,
    safeZ: 10,
    workZ: 0,
    travelSpeed: 8000,
    bedShape: 'rectangular',
    bedWidth: 430,
    bedHeight: 400,
    originX: 0,
    originY: 0,
    acceleration: 2000,
    isDelta: false,
  },
  {
    id: 'marlin_custom',
    name: 'Marlin CNC (Cartesian)',
    firmware: 'marlin',
    baudRate: 250000,
    laserOn: 'M106 S{power}',
    laserOff: 'M107',
    pwmMax: 255,
    safeZ: 5,
    workZ: 0,
    travelSpeed: 5000,
    bedShape: 'rectangular',
    bedWidth: 220,
    bedHeight: 220,
    originX: 0,
    originY: 0,
    isDelta: false,
  }
];

export const INITIAL_MATERIALS: MaterialProfile[] = [
  {
    id: 'mat_birch_3mm',
    name: 'Birch Plywood 3mm',
    category: 'Wood',
    thickness: 3.0,
    laser: '5W Diode',
    engrave: { power: 140, speed: 1800 },
    cut: { power: 255, speed: 150 },
    history: [
      {
        id: 'h1',
        date: '2026-06-10 14:32',
        patternType: 'matrix',
        optimalPower: 150,
        optimalSpeed: 1600,
        notes: 'Clean raster with very minimal soot edges. Air assist enabled.'
      }
    ]
  },
  {
    id: 'mat_birch_6mm',
    name: 'Birch Plywood 6mm',
    category: 'Wood',
    thickness: 6.0,
    laser: '10W Diode',
    engrave: { power: 180, speed: 1500 },
    cut: { power: 255, speed: 80 },
    history: []
  },
  {
    id: 'mat_basswood',
    name: 'Basswood 4mm',
    category: 'Wood',
    thickness: 4.0,
    laser: '5W Diode',
    engrave: { power: 110, speed: 2000 },
    cut: { power: 255, speed: 120 },
    history: []
  },
  {
    id: 'mat_mdf',
    name: 'MDF 3mm',
    category: 'Wood',
    thickness: 3.0,
    laser: '5W Diode',
    engrave: { power: 160, speed: 1400 },
    cut: { power: 255, speed: 100 },
    history: []
  },
  {
    id: 'mat_acrylic_black',
    name: 'Black Acrylic 3mm',
    category: 'Plastics',
    thickness: 3.0,
    laser: '5W Diode',
    engrave: { power: 100, speed: 2400 },
    cut: { power: 255, speed: 140 },
    history: [
      {
        id: 'h2',
        date: '2026-06-12 10:15',
        patternType: 'power_ramp',
        optimalPower: 90,
        optimalSpeed: 2400,
        notes: 'Extremely shiny engraving finish at 90 power. No bubble melt.'
      }
    ]
  },
  {
    id: 'mat_leather_veg',
    name: 'Vegetable Tanned Leather',
    category: 'Leather',
    thickness: 2.0,
    laser: '5W Diode',
    engrave: { power: 60, speed: 2500 },
    cut: { power: 180, speed: 400 },
    history: []
  },
  {
    id: 'mat_cardboard_double',
    name: 'Double-walled Cardboard',
    category: 'Paper/Cardboard',
    thickness: 4.0,
    laser: '5W Diode',
    engrave: { power: 50, speed: 3000 },
    cut: { power: 150, speed: 500 },
    history: []
  },
  {
    id: 'mat_slate',
    name: 'Slate Coaster',
    category: 'Stone',
    thickness: 5.0,
    laser: '5W Diode',
    engrave: { power: 200, speed: 1200 },
    cut: { power: 255, speed: 100 },
    history: [
      {
        id: 'h3',
        date: '2026-06-13 18:05',
        patternType: 'matrix',
        optimalPower: 220,
        optimalSpeed: 1000,
        notes: 'Beautiful frosty-white engraving contrast on the grey slate. Repeatable.'
      }
    ]
  }
];

export function getStoredMaterials(): MaterialProfile[] {
  const data = localStorage.getItem('laserbench_materials');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.every(isValidMaterialProfile)) {
        return parsed;
      }
      console.error("Invalid materials schema in localStorage, resetting to defaults");
    } catch (e) {
      console.error("Error parsing materials database, resetting to defaults", e);
    }
  }
  try {
    localStorage.setItem('laserbench_materials', JSON.stringify(INITIAL_MATERIALS));
  } catch (e) {
    console.error('Failed to save default materials to localStorage', e);
  }
  return INITIAL_MATERIALS;
}

export function saveStoredMaterials(materials: MaterialProfile[]): void {
  try {
    localStorage.setItem('laserbench_materials', JSON.stringify(materials));
  } catch (e) {
    console.error('Failed to save materials to localStorage', e);
  }
}

export function getStoredMachines(): MachineProfile[] {
  const data = localStorage.getItem('laserbench_machines');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.every(isValidMachineProfile)) {
        return parsed;
      }
      console.error("Invalid machines schema in localStorage, resetting to defaults");
    } catch (e) {
      console.error("Error parsing machines database, resetting to defaults", e);
    }
  }
  try {
    localStorage.setItem('laserbench_machines', JSON.stringify(INITIAL_MACHINES));
  } catch (e) {
    console.error('Failed to save default machines to localStorage', e);
  }
  return INITIAL_MACHINES;
}

export function saveStoredMachines(machines: MachineProfile[]): void {
  try {
    localStorage.setItem('laserbench_machines', JSON.stringify(machines));
  } catch (e) {
    console.error('Failed to save machines to localStorage', e);
  }
}
