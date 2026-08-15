# LaserBench P0 Safety Implementation

## Firmware capability layer

- [ ] Add typed Marlin and GRBL capability definitions for home, status, emergency stop, and laser-off operations.
- [ ] Route UI home and emergency-stop actions through serial-store capability methods.
- [ ] Add a direct urgent-write path for firmware real-time commands.
- [ ] Add fail-safe stopped-lock state that prevents late queued writes.
- [ ] Mark homing and position state unknown until verified firmware responses arrive.

## Profile safety validation

- [ ] Validate legacy laser-on/laser-off fields against firmware-specific allowlists.
- [ ] Reject unsafe imported profiles instead of sanitizing them into executable commands.
- [ ] Prevent teardown registration when the active profile has invalid safety commands.
- [ ] Add focused profile import and teardown regression tests.

## Validation

- [ ] Run typecheck, lint, and the full test suite.
- [ ] Record any remaining hardware-in-the-loop limitations.
- [ ] Preserve the original repository state in a separate implementation branch or diff for review.
