import { FirmwareType, LaserControlMode, MachineProfile } from '../types';

export interface UrgentCommand {
  kind: 'realtime' | 'line';
  payload: string;
  label: string;
}

export interface FirmwareCapabilities {
  firmware: FirmwareType;
  homeCommand: string;
  positionQuery: UrgentCommand;
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

  const modeOff = laserMode === 'M106_M107' ? ['M107'] : ['M5'];

  // Only commands supported by this firmware for the selected mode
  const supportedModeOff = capabilities.laserOffCommands.filter((cmd) =>
    modeOff.includes(cmd),
  );

  const offIsAllowed = supportedModeOff.includes(off);

  if (!offIsAllowed) {
    return {
      valid: false,
      reason: `laserOff must be one of: ${modeOff.join(', ')}`,
    };
  }

  const onPattern =
    laserMode === 'M106_M107'
      ? /^M106(?: P\d+)? S\{POWER\}$/
      : laserMode === 'M3_M4_M5'
        ? /^M(?:3|4) S\{POWER\}$/
        : /^M3 S\{POWER\}$/;

  if (!onPattern.test(on)) {
    return { valid: false, reason: `laserOn is incompatible with ${laserMode}` };
  }

  return { valid: true, laserOn: on.replace('{POWER}', '{power}'), laserOff: off };
}

export function validateMachineSafetyProfile(
  machine: MachineProfile,
): { valid: true; laserOn: string; laserOff: string } | { valid: false; reason: string } {
  return validateMachineSafetyCommands(
    machine.firmware,
    machine.laserMode,
    machine.laserOn,
    machine.laserOff,
  );
}
