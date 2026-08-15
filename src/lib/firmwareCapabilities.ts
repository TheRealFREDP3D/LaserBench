import { FirmwareType, LaserControlMode, MachineProfile } from '../types';

export type UrgentCommand =
  | { kind: 'realtime'; payload: string; label: string }
  | { kind: 'line'; payload: string; label: string };

export interface FirmwareCapabilities {
  firmware: FirmwareType;
  homeCommand: string;
  positionQuery: { kind: 'realtime' | 'line'; payload: string; label: string };
  emergencyStop: UrgentCommand;
  laserOffCommands: readonly string[];
}

const GRBL_CAPABILITIES: FirmwareCapabilities = {
  firmware: 'grbl',
  homeCommand: '$H',
  positionQuery: { kind: 'realtime', payload: '?', label: 'GRBL status query (?)' },
  // GRBL receives Ctrl-X as an immediate reset byte, not a line-oriented M-code.
  emergencyStop: { kind: 'realtime', payload: '\x18', label: 'GRBL reset (Ctrl-X)' },
  laserOffCommands: ['M5'],
};

const MARLIN_CAPABILITIES: FirmwareCapabilities = {
  firmware: 'marlin',
  homeCommand: 'G28',
  positionQuery: { kind: 'line', payload: 'M114', label: 'Marlin position query (M114)' },
  emergencyStop: { kind: 'line', payload: 'M112', label: 'Marlin emergency stop (M112)' },
  laserOffCommands: ['M5', 'M107'],
};

export function getFirmwareCapabilities(firmware: FirmwareType): FirmwareCapabilities {
  return firmware === 'grbl' ? GRBL_CAPABILITIES : MARLIN_CAPABILITIES;
}

function normalizeSingleLine(value: string): string {
  const controlCharacters = new RegExp(
    `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
    'g'
  );
  return value.replace(controlCharacters, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

export function validateMachineSafetyCommands(
  firmware: FirmwareType,
  laserMode: LaserControlMode,
  laserOn: string,
  laserOff: string
): { valid: true; laserOn: string; laserOff: string } | { valid: false; reason: string } {
  const on = normalizeSingleLine(laserOn);
  const off = normalizeSingleLine(laserOff);
  const capabilities = getFirmwareCapabilities(firmware);

  const allowedOff = laserMode === 'M106_M107' ? ['M107'] : ['M5'];
  // Check: (a) the requested off command is in the mode allowlist, AND
  //        (b) the firmware actually supports at least one command from that mode allowlist.
  // Condition (b) rejects cross-firmware modes (e.g. GRBL with M106_M107).
  const offIsAllowed =
    allowedOff.includes(off) &&
    capabilities.laserOffCommands.some((cmd) => allowedOff.includes(cmd));
  if (!offIsAllowed) {
    return { valid: false, reason: `laserOff must be one of: ${allowedOff.join(', ')}` };
  }

  const powerWord = 'S\\{POWER\\}';
  const onPattern = laserMode === 'M106_M107'
    ? new RegExp(`^M106(?: P\\d+)? ${powerWord}$`)
    : laserMode === 'M3_M4_M5'
      ? new RegExp(`^M(?:3|4) ${powerWord}$`)
      : new RegExp(`^M3 ${powerWord}$`);

  if (!onPattern.test(on)) {
    return { valid: false, reason: `laserOn is incompatible with ${laserMode}` };
  }

  return { valid: true, laserOn: on.replace('{POWER}', '{power}'), laserOff: off };
}

export function validateMachineSafetyProfile(machine: MachineProfile): { valid: true } | { valid: false; reason: string } {
  return validateMachineSafetyCommands(machine.firmware, machine.laserMode, machine.laserOn, machine.laserOff);
}
