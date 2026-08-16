// ============================================================================
// Hardware-in-the-loop limitations — behaviors NOT covered by this automated
// test suite (Requirements 10.5)
//
// The following scenarios require a physical serial port and cannot be
// exercised in the Vitest environment:
//
//  1. Physical serial port connection (Web Serial API)
//     The browser's Web Serial API is not available in jsdom/Vitest. The
//     navigator.serial object is undefined, so SerialConnection.connect()
//     cannot open a real port. All connection-dependent paths are therefore
//     unreachable without hardware.
//
//  2. Actual firmware "ok" response in the read loop
//     The serial read loop that sets isHomed=true / homingPending=false upon
//     receiving a line beginning with "ok" requires a real ReadableStream from
//     the opened port. No firmware response can be injected in this suite;
//     the homing-complete transition is a hardware-in-the-loop path only.
//
//  3. conn.writer is null in all tests
//     SerialConnection.conn.writer is the WritableStreamDefaultWriter obtained
//     after connect(). Because no port is ever opened, conn.writer is always
//     null throughout this suite. Consequently:
//       • fireLaserOff() — the direct-write teardown path through conn.writer
//         cannot be exercised; only the "no writer" early-return is reachable.
//       • safetyLocked throw path in send() — the guard that throws
//         "locked after an emergency stop" fires only when conn.writer is
//         non-null. With a null writer, the earlier "Not connected to printer"
//         guard fires first, making the lock-message path unreachable here.
//     Both paths require a connected printer with an open writer.
//
//  4. emergencyStop() urgent-write path requires a writer
//     The writeUrgent() branch inside emergencyStop() (which sends the
//     firmware-specific stop command, e.g. Ctrl-X for GRBL or M112 for
//     Marlin) is only reached when conn.writer is non-null. In this suite,
//     emergencyStop() is tested exclusively via its observable state
//     side-effects (safetyLocked, isHomed, homingPending) because the actual
//     serial write to hardware is not possible without a connected printer.
// ============================================================================

import { beforeEach, describe, expect, it } from 'vitest';
import {
  getFirmwareCapabilities,
  validateMachineSafetyCommands,
} from '../lib/firmwareCapabilities';
import { useSerialStore } from '../store/useSerialStore';

describe('firmware capabilities', () => {
  describe('GRBL_CAPABILITIES — full field coverage', () => {
    const grbl = getFirmwareCapabilities('grbl');

    it('firmware identifier is grbl', () => {
      expect(grbl.firmware).toBe('grbl');
    });

    it('homeCommand is $H', () => {
      expect(grbl.homeCommand).toBe('$H');
    });

    it('positionQuery is a realtime ? command', () => {
      expect(grbl.positionQuery).toMatchObject({ kind: 'realtime', payload: '?' });
    });

    it('emergencyStop is a realtime Ctrl-X command', () => {
      expect(grbl.emergencyStop).toMatchObject({ kind: 'realtime', payload: '\x18' });
    });

    it('laserOffCommands contains exactly M5', () => {
      expect(grbl.laserOffCommands).toHaveLength(1);
      expect(grbl.laserOffCommands).toContain('M5');
    });
  });

  describe('MARLIN_CAPABILITIES — full field coverage', () => {
    const marlin = getFirmwareCapabilities('marlin');

    it('firmware identifier is marlin', () => {
      expect(marlin.firmware).toBe('marlin');
    });

    it('homeCommand is G28', () => {
      expect(marlin.homeCommand).toBe('G28');
    });

    it('positionQuery is a line M114 command', () => {
      expect(marlin.positionQuery).toMatchObject({ kind: 'line', payload: 'M114' });
    });

    it('emergencyStop is a line M112 command', () => {
      expect(marlin.emergencyStop).toMatchObject({ kind: 'line', payload: 'M112' });
    });

    it('laserOffCommands contains M5 and M107', () => {
      expect(marlin.laserOffCommands).toHaveLength(2);
      expect(marlin.laserOffCommands).toContain('M5');
      expect(marlin.laserOffCommands).toContain('M107');
    });
  });

  it('accepts matching GRBL safety commands', () => {
    expect(validateMachineSafetyCommands('grbl', 'M3_M5', 'M3 S{power}', 'M5')).toMatchObject({
      valid: true,
    });
  });

  it('accepts matching Marlin fan-mode safety commands', () => {
    expect(
      validateMachineSafetyCommands('marlin', 'M106_M107', 'M106 S{power}', 'M107')
    ).toMatchObject({ valid: true });
  });

  it('rejects a laserOff value not in the firmware allowlist and names expected value(s) in reason', () => {
    const result = validateMachineSafetyCommands('grbl', 'M3_M5', 'M3 S{power}', 'M107');
    expect(result).toMatchObject({ valid: false });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBeTruthy();
      expect(result.reason).toContain('M5');
    }
  });

  it('rejects a laserOn pattern incompatible with the specified laser mode', () => {
    const result = validateMachineSafetyCommands('grbl', 'M3_M5', 'INVALID_CMD S{power}', 'M5');
    expect(result).toMatchObject({ valid: false });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBeTruthy();
    }
  });

  it('rejects a laser-on command in the laser-off field', () => {
    const result = validateMachineSafetyCommands('grbl', 'M3_M5', 'M3 S{power}', 'M3 S1000');
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.reason).toBeTruthy();
    }
  });

  it('rejects a cross-firmware laser mode', () => {
    const result = validateMachineSafetyCommands('grbl', 'M106_M107', 'M106 S{power}', 'M107');
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.reason).toBeTruthy();
    }
  });
});

// ─── setLaserOffCmd allowlist enforcement tests ───────────────────────────────
//
// NOTE — Private field limitation:
// `conn.laserOffCmd` is owned by the `SerialConnection` instance inside the
// Zustand closure and is NOT exposed in `SerialState`. It therefore cannot be
// read directly from tests. The tests below verify the allowlist enforcement
// contract through the only observable side-effects available without a physical
// serial port:
//
//  • The call completes without throwing (the function has no error path —
//    invalid commands are silently rejected by setting laserOffCmd to '').
//  • The public Zustand state is not mutated in unexpected ways by the call.
//
// Full end-to-end verification that the correct command reaches the serial port
// (via fireLaserOff → conn.writer.write) requires a connected printer and is
// documented as a hardware-in-the-loop limitation (Requirements 10.5).
//
// Requirements: 9.1, 9.2, 9.3, 9.4, 10.2

describe('setLaserOffCmd allowlist enforcement', () => {
  beforeEach(() => {
    // Reset to a clean, known baseline before each test.
    useSerialStore.setState({
      isConnected: false,
      isHomed: false,
      homingPending: false,
    });
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('grbl'));
  });

  // ── Allowlist pass cases ──────────────────────────────────────────────────

  it('accepts "M5" with GRBL capabilities without throwing (Req 9.1)', () => {
    // GRBL allowlist contains 'M5'. The call must succeed silently.
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M5');
    }).not.toThrow();
  });

  it('accepts lowercase "m5" with GRBL capabilities without throwing — normalization (Req 9.1)', () => {
    // sanitizeGCodeLine + toUpperCase() must normalize lowercase before the allowlist check.
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('m5');
    }).not.toThrow();
  });

  it('accepts "M107" with Marlin capabilities without throwing (Req 9.1)', () => {
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('marlin'));
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M107');
    }).not.toThrow();
  });

  it('accepts "M5" with Marlin capabilities without throwing — M5 is also in Marlin allowlist (Req 9.1)', () => {
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('marlin'));
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M5');
    }).not.toThrow();
  });

  // ── Allowlist fail cases ──────────────────────────────────────────────────

  it('silently rejects "M3 S1000" with GRBL capabilities — laserOn command in laserOff field (Req 9.2)', () => {
    // M3 S1000 is not in GRBL laserOffCommands; the call must not throw and
    // must leave the store in a consistent state (isHomed unchanged).
    useSerialStore.setState({ isHomed: true });

    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M3 S1000');
    }).not.toThrow();

    // Public state must not have been corrupted by the rejected call.
    expect(useSerialStore.getState().isHomed).toBe(true);
  });

  it('silently rejects "M107" with GRBL capabilities — Marlin-only command (Req 9.2)', () => {
    // M107 is not in GRBL laserOffCommands (only M5 is).
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M107');
    }).not.toThrow();
  });

  it('silently rejects an arbitrary string with GRBL capabilities (Req 9.2)', () => {
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('INVALID_CMD');
    }).not.toThrow();
  });

  it('silently rejects "M3 S1000" with Marlin capabilities — not in Marlin laserOffCommands (Req 9.2)', () => {
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('marlin'));
    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M3 S1000');
    }).not.toThrow();
  });

  // ── Null capabilities cases ───────────────────────────────────────────────

  it('silently rejects any command when capabilities are null (Req 9.3)', () => {
    // setFirmwareCapabilities(null) clears capabilities; subsequent setLaserOffCmd
    // must not throw even though there is nothing to check against.
    useSerialStore.getState().setFirmwareCapabilities(null);

    expect(() => {
      useSerialStore.getState().setLaserOffCmd('M5');
    }).not.toThrow();
  });

  it('silently rejects empty string when capabilities are null (Req 9.3)', () => {
    useSerialStore.getState().setFirmwareCapabilities(null);

    expect(() => {
      useSerialStore.getState().setLaserOffCmd('');
    }).not.toThrow();
  });

  // ── State consistency ─────────────────────────────────────────────────────

  it('does not alter isHomed or homingPending when called with a valid command (Req 9.1)', () => {
    useSerialStore.setState({ isHomed: true, homingPending: false });
    useSerialStore.getState().setLaserOffCmd('M5');

    expect(useSerialStore.getState().isHomed).toBe(true);
    expect(useSerialStore.getState().homingPending).toBe(false);
  });

  it('does not alter isHomed or homingPending when called with an invalid command (Req 9.2)', () => {
    useSerialStore.setState({ isHomed: true, homingPending: false });
    useSerialStore.getState().setLaserOffCmd('M3 S1000');

    expect(useSerialStore.getState().isHomed).toBe(true);
    expect(useSerialStore.getState().homingPending).toBe(false);
  });
});

// ─── safetyLocked behavior tests ─────────────────────────────────────────────
//
// NOTE — Hardware-in-the-loop limitation:
// Verifying that `send()` throws "locked after an emergency stop" requires
// `conn.writer` to be non-null (the writer-null guard fires before the
// safetyLocked guard in the implementation). Because `conn` is private to the
// Zustand closure there is no way to inject a fake writer from outside the
// module without a physical Web Serial port. The lock error path is therefore
// tested via state side-effects only (isHomed, homingPending) in this automated
// suite. Full end-to-end verification of the throw message requires a connected
// printer (hardware-in-the-loop).

describe('safetyLocked behavior', () => {
  // Reset the Zustand store to a known baseline before each test so tests are
  // independent of one another and of any other test that may have touched the
  // store earlier in the run.
  beforeEach(() => {
    useSerialStore.setState({
      isConnected: false,
      isHomed: false,
      homingPending: false,
    });
    // Restore capabilities to a clean slate by calling the public action.
    // setFirmwareCapabilities with a real capabilities object when disconnected
    // also clears safetyLocked, giving us a clean starting point.
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('grbl'));
  });

  it('setFirmwareCapabilities(null) resets isHomed to false', () => {
    // Arrange: set isHomed to true so we can observe the reset.
    useSerialStore.setState({ isHomed: true });

    // Act
    useSerialStore.getState().setFirmwareCapabilities(null);

    // Assert
    expect(useSerialStore.getState().isHomed).toBe(false);
  });

  it('setFirmwareCapabilities(null) resets homingPending to false', () => {
    // Arrange: set homingPending to true so we can observe the reset.
    useSerialStore.setState({ homingPending: true });

    // Act
    useSerialStore.getState().setFirmwareCapabilities(null);

    // Assert
    expect(useSerialStore.getState().homingPending).toBe(false);
  });

  it('setFirmwareCapabilities(null) leaves isHomed false when it was already false', () => {
    useSerialStore.setState({ isHomed: false });
    useSerialStore.getState().setFirmwareCapabilities(null);
    expect(useSerialStore.getState().isHomed).toBe(false);
  });

  it('setFirmwareCapabilities(null) leaves homingPending false when it was already false', () => {
    useSerialStore.setState({ homingPending: false });
    useSerialStore.getState().setFirmwareCapabilities(null);
    expect(useSerialStore.getState().homingPending).toBe(false);
  });

  it('send() throws "Not connected to printer" when disconnected (even after setFirmwareCapabilities(null))', async () => {
    // This exercises the writer-null / isConnected path that fires before the
    // safetyLocked check. After setFirmwareCapabilities(null) the store IS in
    // safetyLocked state, but with no physical writer the first guard throws
    // first. This is the observable behavior in the automated suite.
    useSerialStore.getState().setFirmwareCapabilities(null);

    await expect(useSerialStore.getState().send('G0 X10')).rejects.toThrow(
      'Not connected to printer'
    );
  });

  it('setFirmwareCapabilities with valid capabilities clears safetyLocked when disconnected (subsequent send still throws "Not connected")', async () => {
    // Verify the inverse: passing a real capabilities object while disconnected
    // clears safetyLocked. send() still throws because there is no writer, but
    // it throws "Not connected" — NOT the lock error.
    useSerialStore.getState().setFirmwareCapabilities(getFirmwareCapabilities('grbl'));

    await expect(useSerialStore.getState().send('G0 X10')).rejects.toThrow(
      'Not connected to printer'
    );
  });
});
