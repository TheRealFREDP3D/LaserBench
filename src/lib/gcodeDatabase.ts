export interface GCodeEntry {
  code: string;
  name: string;
  category: 'motion' | 'laser' | 'coords' | 'system';
  description: string;
  syntax: string;
  example: string;
  explanation: string;
  compatibility: 'GRBL & Marlin' | 'GRBL Only' | 'Marlin Only';
}

export const GCODE_DATABASE: GCodeEntry[] = [
  {
    code: 'G0',
    name: 'Rapid Positioning (Non-cutting Move)',
    category: 'motion',
    description:
      'Moves the laser head at maximum machine travel feedrate to the target coordinate without firing the laser.',
    syntax: 'G0 X[pos] Y[pos] Z[pos]',
    example: 'G0 X15.00 Y25.50',
    explanation:
      'Safely and rapidly shifts the laser nozzle between separate burning segments. By default, laser controllers shut off the beam completely during G0 travel commands to prevent unwanted scorch marks.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G1',
    name: 'Linear Cutting Motion',
    category: 'motion',
    description:
      'Straight line translation at a specified cutting speed (F) while generating a regulated laser beam (S).',
    syntax: 'G1 X[pos] Y[pos] Z[pos] F[feedrate] S[power]',
    example: 'G1 X50.00 Y10.00 F1800 S120',
    explanation:
      'The fundamental building block of all vector engraving and cutting paths. Coordinate dimensions dictate target destinations, F defines travel rate in millimeters per minute, and S scales the duty-cycle output of the laser.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G20',
    name: 'Set Coordinates to Imperial (Inches)',
    category: 'coords',
    description: 'Instructs the controller firmware to calculate all coordinate numbers as inches.',
    syntax: 'G20',
    example: 'G20',
    explanation:
      'Signals that subsequent numbers correspond to inches (where 1.0 = 25.4mm). Almost all modern hobbyist and industrial diode lasers default to Metric (G21), and it is not recommended to mix them.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G21',
    name: 'Set Coordinates to Metric (Millimeters)',
    category: 'coords',
    description:
      'Instructs the controller firmware to calculate all input coordinates as millimeters.',
    syntax: 'G21',
    example: 'G21',
    explanation:
      'Forces the system to read numbers in standard millimeters. This is the global standard for laser engraving, ensuring highly reproducible calibration step widths.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G28',
    name: 'Home All Axes / Reference Run',
    category: 'system',
    description:
      'Triggers a homing sequence to locate physical microswitches/limits to assert a safe coordinate system.',
    syntax: 'G28',
    example: 'G28',
    explanation:
      'Moves the laser carriage slowly until triggering limit sensor bars on the X, Y, and Z frame rails. Crucial step to define physical absolute zero bounds before calibration jigs are burnt.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G90',
    name: 'Absolute Machine Positioning',
    category: 'coords',
    description:
      'Directs the control firmware to define X/Y/Z positions relative to the absolute origin (0,0) of the workbed.',
    syntax: 'G90',
    example: 'G90',
    explanation:
      'Instructs that G1 X10 will move the nozzle exactly 10mm from coordinate origin. LaserBench compiles the entire layout suite in G90 Mode to protect machine limits.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'G91',
    name: 'Incremental / Relative Positioning',
    category: 'coords',
    description:
      "Directs the control firmware to count positions relative to the carriage's immediate position.",
    syntax: 'G91',
    example: 'G91',
    explanation:
      'If the nozzle rests at X10, committing G1 X10 in Relative mode offsets the head an extra 10mm to the right, landing at physical position X20.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M3',
    name: 'Laser Fire (Spindle On - Constant Power)',
    category: 'laser',
    description:
      'Turns on the laser beam right away with absolute continuous power proportionate to S parameter.',
    syntax: 'M3 S[power]',
    example: 'M3 S10',
    explanation:
      'Fires the laser immediately regardless of travel speed. Safe for low-intensity focal testing (e.g. S1 to create a visible dot). DO NOT use for high-power patterns since it will overburn pauses, sharp corners, or slower accelerations.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M4',
    name: 'Laser Fire (Dynamic Power Mode)',
    category: 'laser',
    description:
      'Enables GRBL dynamic laser tuning. Modulates beam strength dynamically based on speed and acceleration.',
    syntax: 'M4 S[power]',
    example: 'M4 S150',
    explanation:
      'Essential for superior engraving quality on GRBL hardware. As the machine slows down to execute pivot corners, the microcontroller auto-dims the laser proportionally to guarantee highly consistent line densities.',
    compatibility: 'GRBL Only',
  },
  {
    code: 'M5',
    name: 'Laser Cutter Off / Power Stop',
    category: 'laser',
    description: 'Immediately de-energizes the laser PWM output, shutting off the optical beam.',
    syntax: 'M5',
    example: 'M5',
    explanation:
      'The standard safety deconstruction command. Added preceding all rapid travels (G0) and at the absolute termination of calibration scripts to safeguard hands and materials.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M106',
    name: 'Air Assist / Auxiliary Fan Turn On',
    category: 'system',
    description: 'Powers manual electronics relays or active cooling/shielding accessories.',
    syntax: 'M106 S[pwm_value]',
    example: 'M106 S255',
    explanation:
      'Controls on-board fan outputs. Intelligently utilized in laser setups to trigger air-assist pumps to purge carbon fumes, keeping the optical target smoke-free for maximum wood bite.',
    compatibility: 'Marlin Only',
  },
  {
    code: 'M107',
    name: 'Air Assist / Auxiliary Fan Cutoff',
    category: 'system',
    description: 'Deactivates the cooling fan power lines or high pressure solenoids.',
    syntax: 'M107',
    example: 'M107',
    explanation:
      'Shuts off fume fans and accessory nozzles once engraving steps have wound down completely.',
    compatibility: 'Marlin Only',
  },
  {
    code: 'F',
    name: 'Feedrate Specifier (Movement Speed)',
    category: 'motion',
    description: 'Configures travel velocity of cutting/marking paths.',
    syntax: 'F[value_mm_per_min]',
    example: 'G1 X40.0 F1500',
    explanation:
      'Feeds coordinates inside motion cycles. Configured in Millimeters per Minute (mm/min). To translate, divide F by 60 for mm/sec (e.g. F1200 equates to a marking rate of 20 mm/sec).',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'S',
    name: 'Laser Power Scale Selector',
    category: 'laser',
    description: 'Dictates the voltage PWM duty cycles representing laser strength.',
    syntax: 'S[pwm_value]',
    example: 'G1 X20.0 S180',
    explanation:
      'Typically ranges from S0 (0%) up to S255 (100% on 8-bit boards) or S1000 (standard in 32-bit GRBL controllers). Scaling is handled relative to the active Machine configurations.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M112',
    name: 'Emergency Stop / Immediate Halt',
    category: 'system',
    description:
      'Triggers an immediate emergency hardware shutoff, disabling all stepper motors, heaters, and laser outputs instantly.',
    syntax: 'M112',
    example: 'M112',
    explanation:
      'The ultimate emergency safety overrides command. If a fire starts or the machine crashes into physical carriage bounds, M112 commands the firmware to freeze everything on the spot and disconnect communication, requiring physical power-cycling to recover.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M114',
    name: 'Get Current Position Reading',
    category: 'coords',
    description:
      'Queries the laser controller to return the instantaneous physical coordinate locations of all axes.',
    syntax: 'M114',
    example: 'M114',
    explanation:
      'Instructs the board to return X, Y, Z coordinates to help stream software tools map real-time positional progress or verify calibration offsets.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M115',
    name: 'Get Firmware Version & Capabilities',
    category: 'system',
    description:
      'Requests the hardware board state, detailing active capabilities, buffer sizes, and manufacturer firmware descriptors.',
    syntax: 'M115',
    example: 'M115',
    explanation:
      'Useful for laser hosting senders during initial handshake connections to automatically adapt parsing logic to GRBL or Marlin configurations.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M2',
    name: 'Program Termination / End of Session',
    category: 'system',
    description:
      'Signals to the controller that the active G-code program script has completed fully.',
    syntax: 'M2',
    example: 'M2',
    explanation:
      'Historically used to finalize tapes. In compact laser operations, it reset controller defaults, shut down spindles/lasers, and prepared memory buffers for subsequent design cycles.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M30',
    name: 'Program End and Rewind Buffer',
    category: 'system',
    description:
      'Instructs the controller that the job file has ended, powers down active subsystems, and resets the parsing buffer line target back to the start index.',
    syntax: 'M30',
    example: 'M30',
    explanation:
      'Appended at the absolute bottom of industrial cut layouts to close the stream file, turn off relays, and reset feed pointers for safety.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M500',
    name: 'Save Configuration Settings to EEPROM',
    category: 'system',
    description:
      'Saves active settings (like steps/mm, acceleration, max speeds, power limits) permanently to onboard EEPROM memory.',
    syntax: 'M500',
    example: 'M500',
    explanation:
      'Ensures custom calibration values parsed on-the-fly survive power cycles. Vital when tuning machine motor steps or acceleration characteristics.',
    compatibility: 'GRBL & Marlin',
  },
  {
    code: 'M501',
    name: 'Restore Loaded EEPROM Settings',
    category: 'system',
    description:
      'Reloads saved config parameters from EEPROM memory into active RAM runtime buffers.',
    syntax: 'M501',
    example: 'M501',
    explanation:
      'Safely discards temporary configurations or diagnostic parameters back to stable, saved default profiles without requiring a hard hardware reboot.',
    compatibility: 'GRBL & Marlin',
  },
];
