import { useEffect } from 'react';
import { getFirmwareCapabilities, validateMachineSafetyProfile } from '../lib/firmwareCapabilities';
import { MachineProfile } from '../types';
import { useSerialStore } from '../store/useSerialStore';

/**
 * Wires machine safety profile validation to the serial store.
 * Ensures firmware capabilities are set and laser-off command is registered
 * whenever the active machine changes.
 */
export function useMachineSafety(activeMachine: MachineProfile | null) {
  const { setFirmwareCapabilities, setLaserOffCmd } = useSerialStore();

  useEffect(() => {
    const safety = activeMachine ? validateMachineSafetyProfile(activeMachine) : null;
    const capabilities =
      safety?.valid && activeMachine ? getFirmwareCapabilities(activeMachine.firmware) : null;

    setFirmwareCapabilities(capabilities);
    // Fall back to universal M5 if profile is invalid or missing - never leave laserOffCmd empty
    setLaserOffCmd(safety?.valid ? activeMachine?.laserOff ?? 'M5' : 'M5');
  }, [activeMachine, setFirmwareCapabilities, setLaserOffCmd]);
}
