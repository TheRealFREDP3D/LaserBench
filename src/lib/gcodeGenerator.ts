import {
  MachineProfile,
  MaterialProfile,
  PatternType,
  GeneratedData,
  SvgPathElement,
  PathSegment,
} from '../types';
import { DeltaKinematics } from './deltaKinematics';
import { renderTextPath } from './vectorFont';

const VALID_GCODE_LETTERS = /^[GMFTSO%N]/i;
const MAX_LINE_LENGTH = 256;

function sanitizeGCodeLine(line: string): string {
  let cleaned = '';
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if (code >= 0x20 || code === 0x09) cleaned += line[i];
  }
  const commentIdx = cleaned.indexOf(';');
  if (commentIdx !== -1) cleaned = cleaned.slice(0, commentIdx);
  cleaned = cleaned.trim();
  if (cleaned.length === 0) return '';
  if (cleaned.length > MAX_LINE_LENGTH) cleaned = cleaned.slice(0, MAX_LINE_LENGTH);
  if (!VALID_GCODE_LETTERS.test(cleaned)) return '';
  return cleaned;
}

function sanitizeGCodeBlock(text: string): string {
  return text
    .split('\n')
    .map(sanitizeGCodeLine)
    .filter((l) => l.length > 0)
    .join('\n');
}

function replacePower(template: string, power: number): string {
  const idx = template.indexOf('{power}');
  if (idx === -1) return template;
  return template.slice(0, idx) + power.toString() + template.slice(idx + 7);
}

const DEFAULT_DELTA_PARAMS = {
  deltaRadius: 105.6,
  deltaRodLength: 217.0,
  deltaTowerAngleOffset: 0,
  printRadius: 85,
};

interface PatternContext {
  machine: MachineProfile;
  material: MaterialProfile;
  addSegment: (
    points: [number, number][],
    power: number,
    speed: number,
    z: number,
    isLaserOn: boolean
  ) => void;
  labelPower: number;
  labelSpeed: number;
  textSize: number;
  textLetterSpacing: number;
  powerMin: number;
  powerMax: number;
  speedMin: number;
  speedMax: number;
  powerSteps: number;
  speedSteps: number;
  blockSize: number;
  zMin: number;
  zMax: number;
  zSteps: number;
  kerfValues: number[];
}

function generateMatrix(ctx: PatternContext) {
  const {
    addSegment,
    powerMin,
    powerMax,
    speedMin,
    speedMax,
    powerSteps,
    speedSteps,
    blockSize,
    textSize,
    textLetterSpacing,
    labelPower,
    labelSpeed,
    machine,
  } = ctx;

  const gap = 4;
  const totalWidth = speedSteps * (blockSize + gap);
  const totalHeight = powerSteps * (blockSize + gap);

  const startX = -totalWidth / 2;
  const startY = -totalHeight / 2;

  for (let s = 0; s < speedSteps; s++) {
    const speed =
      speedSteps > 1 ? speedMin + (speedMax - speedMin) * (s / (speedSteps - 1)) : speedMin;
    const px = startX + s * (blockSize + gap);

    const speedLabel = Math.round(speed).toString();
    const speedLabelPaths = renderTextPath(
      speedLabel,
      px + blockSize / 2 - (speedLabel.length * textSize * 0.4) / 2,
      startY - gap - textSize,
      textSize * 0.7,
      textLetterSpacing * 0.7
    );
    speedLabelPaths.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));

    for (let p = 0; p < powerSteps; p++) {
      const power =
        powerSteps > 1 ? powerMin + (powerMax - powerMin) * (p / (powerSteps - 1)) : powerMin;
      const py = startY + p * (blockSize + gap);

      const points: [number, number][] = [
        [px, py],
        [px + blockSize, py],
        [px + blockSize, py + blockSize],
        [px, py + blockSize],
        [px, py],
      ];
      addSegment(points, Math.round(power), Math.round(speed), machine.workZ, true);

      if (s === 0) {
        const pLabel = Math.round(power).toString();
        const pLabelPaths = renderTextPath(
          pLabel,
          px - gap - pLabel.length * textSize * 0.5,
          py + blockSize / 2 - textSize / 2,
          textSize * 0.7,
          textLetterSpacing * 0.7
        );
        pLabelPaths.forEach((pts) => addSegment(pts, labelPower, labelSpeed, machine.workZ, true));
      }
    }
  }

  return { patternWidth: totalWidth, patternHeight: totalHeight };
}

function generatePowerRamp(ctx: PatternContext) {
  const {
    addSegment,
    powerMin,
    powerMax,
    speedMin,
    blockSize,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
  } = ctx;
  const rampLen = 80;
  const startX = -rampLen / 2;
  const startY = -blockSize / 2;

  addSegment(
    [
      [startX, startY],
      [startX + rampLen, startY],
      [startX + rampLen, startY + blockSize],
      [startX, startY + blockSize],
      [startX, startY],
    ],
    labelPower,
    labelSpeed,
    machine.workZ,
    true
  );

  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const x1 = startX + (i / steps) * rampLen;
    const x2 = startX + ((i + 1) / steps) * rampLen;
    const p = powerMin + (i / steps) * (powerMax - powerMin);
    addSegment(
      [
        [x1, startY + 0.5],
        [x2, startY + 0.5],
        [x2, startY + blockSize - 0.5],
        [x1, startY + blockSize - 0.5],
        [x1, startY + 0.5],
      ],
      Math.round(p),
      speedMin,
      machine.workZ,
      true
    );
  }

  const label = `PWR RAMP: ${Math.round(powerMin)}-${Math.round(powerMax)} F${Math.round(speedMin)}`;
  const lp = renderTextPath(
    label,
    startX,
    startY + blockSize + 2,
    textSize * 0.6,
    textLetterSpacing * 0.6
  );
  lp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));

  return { patternWidth: rampLen, patternHeight: blockSize + 10 };
}

function generateSpeedRamp(ctx: PatternContext) {
  const {
    addSegment,
    powerMin,
    speedMin,
    speedMax,
    speedSteps,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
  } = ctx;
  const lineLen = 60;
  const gap = 5;
  const totalH = speedSteps * gap;
  const startX = -lineLen / 2;
  const startY = -totalH / 2;

  for (let i = 0; i < speedSteps; i++) {
    const speed =
      speedSteps > 1 ? speedMin + (speedMax - speedMin) * (i / (speedSteps - 1)) : speedMin;
    const y = startY + i * gap;
    addSegment(
      [
        [startX, y],
        [startX + lineLen, y],
      ],
      powerMin,
      Math.round(speed),
      machine.workZ,
      true
    );

    const label = Math.round(speed).toString();
    const lp = renderTextPath(
      label,
      startX + lineLen + 2,
      y - textSize / 2,
      textSize * 0.5,
      textLetterSpacing * 0.5
    );
    lp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));
  }

  const title = `SPEED RAMP (S${Math.round(powerMin)})`;
  const tp = renderTextPath(title, startX, startY - 5, textSize * 0.6, textLetterSpacing * 0.6);
  tp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));

  return { patternWidth: lineLen + 20, patternHeight: totalH + 10 };
}

function generateFocusLadder(ctx: PatternContext) {
  const {
    addSegment,
    powerMin,
    speedMin,
    zMin,
    zMax,
    zSteps,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
  } = ctx;
  const lineLen = 40;
  const gap = 8;
  const totalH = zSteps * gap;
  const startX = -lineLen / 2;
  const startY = -totalH / 2;

  for (let i = 0; i < zSteps; i++) {
    const z = zSteps > 1 ? zMin + (zMax - zMin) * (i / (zSteps - 1)) : zMin;
    const y = startY + i * gap;

    addSegment(
      [
        [startX, y],
        [startX + lineLen, y],
      ],
      powerMin,
      speedMin,
      z,
      true
    );

    const label = `Z:${z.toFixed(2)}`;
    const lp = renderTextPath(
      label,
      startX + lineLen + 2,
      y - textSize / 2,
      textSize * 0.5,
      textLetterSpacing * 0.5
    );
    lp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));
  }

  const title = `FOCUS LADDER (P:${Math.round(powerMin)} S:${Math.round(speedMin)})`;
  const tp = renderTextPath(title, startX, startY - 6, textSize * 0.6, textLetterSpacing * 0.6);
  tp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));

  return { patternWidth: lineLen + 30, patternHeight: totalH + 15 };
}

function generateKerfTest(ctx: PatternContext, nominal: number) {
  const {
    addSegment,
    kerfValues,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    material,
  } = ctx;
  const slotW = 15;
  const slotH = 20;
  const gap = 10;
  const totalW = kerfValues.length * (slotW + gap);
  const startX = -totalW / 2;
  const startY = -slotH / 2;

  kerfValues.forEach((offset, i) => {
    const px = startX + i * (slotW + gap);
    const actualW = nominal + offset;

    const pts: [number, number][] = [
      [px, startY + slotH],
      [px, startY],
      [px + actualW, startY],
      [px + actualW, startY + slotH],
    ];
    addSegment(pts, material.cut.power, material.cut.speed, machine.workZ, true);

    const label = offset >= 0 ? `+${offset.toFixed(2)}` : offset.toFixed(2);
    const lp = renderTextPath(
      label,
      px + actualW / 2 - (label.length * textSize * 0.4) / 2,
      startY + slotH + 2,
      textSize * 0.5,
      textLetterSpacing * 0.5
    );
    lp.forEach((p) => addSegment(p, labelPower, labelSpeed, machine.workZ, true));
  });

  return { patternWidth: totalW, patternHeight: slotH + 10 };
}

export function generatePatternPaths(
  patternType: PatternType,
  machine: MachineProfile,
  material: MaterialProfile,
  config: {
    powerSteps?: number;
    speedSteps?: number;
    powerMin?: number;
    powerMax?: number;
    speedMin?: number;
    speedMax?: number;
    blockSize?: number;
    nominalThickness?: number;
    kerfValues?: number[];
    zMin?: number;
    zMax?: number;
    zSteps?: number;
    patternPosition?: { x: number; y: number };
  }
): GeneratedData {
  const powerMin = config.powerMin ?? 50;
  const powerMax = config.powerMax ?? machine.pwmMax;
  const speedMin = config.speedMin ?? 500;
  const speedMax = config.speedMax ?? 3000;
  const powerSteps = config.powerSteps ?? 5;
  const speedSteps = config.speedSteps ?? 5;
  const blockSize = config.blockSize ?? 10;
  const zMin = config.zMin ?? 0;
  const zMax = config.zMax ?? 5;
  const zSteps = config.zSteps ?? 5;
  const kerfValues = config.kerfValues ?? [0.1, 0.15, 0.2, 0.25];
  const pos = config.patternPosition ?? { x: 0, y: 0 };

  const textSize = Math.max(2, blockSize * 0.4);
  const textLetterSpacing = textSize * 0.3;

  let deltaKin: DeltaKinematics | null = null;
  if (machine.isDelta) {
    deltaKin = new DeltaKinematics({
      deltaRadius: machine.deltaRadius ?? DEFAULT_DELTA_PARAMS.deltaRadius,
      deltaRodLength: machine.deltaRodLength ?? DEFAULT_DELTA_PARAMS.deltaRodLength,
      deltaTowerAngleOffset:
        machine.deltaTowerAngleOffset ?? DEFAULT_DELTA_PARAMS.deltaTowerAngleOffset,
      printRadius: machine.deltaPrintRadius ?? DEFAULT_DELTA_PARAMS.printRadius,
    });
  }

  const deltaWarnings: string[] = [];
  const pathGroups: PathSegment[] = [];

  function addSegment(
    points: [number, number][],
    power: number,
    speed: number,
    z: number,
    isLaserOn: boolean
  ) {
    const movedPoints = points.map(([x, y]) => [x + pos.x, y + pos.y] as [number, number]);

    if (deltaKin) {
      const unreachable = movedPoints.filter(([x, y]) => !deltaKin!.isReachable(x, y));
      if (unreachable.length > 0) {
        const warn = `Delta: Point [${unreachable[0][0].toFixed(1)}, ${unreachable[0][1].toFixed(1)}] out of bounds`;
        if (!deltaWarnings.includes(warn)) deltaWarnings.push(warn);
      }
    }
    pathGroups.push({ points: movedPoints, power, speed, z, isLaserOn });
  }

  const labelPower = Math.round(machine.pwmMax * 0.4);
  const labelSpeed = Math.min(2000, machine.travelSpeed / 2);

  const ctx: PatternContext = {
    machine,
    material,
    addSegment,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    powerMin,
    powerMax,
    speedMin,
    speedMax,
    powerSteps,
    speedSteps,
    blockSize,
    zMin,
    zMax,
    zSteps,
    kerfValues,
  };

  let patternWidth = 100;
  let patternHeight = 100;

  if (patternType === 'matrix') {
    const r = generateMatrix(ctx);
    patternWidth = r.patternWidth;
    patternHeight = r.patternHeight;
  } else if (patternType === 'power_ramp') {
    const r = generatePowerRamp(ctx);
    patternWidth = r.patternWidth;
    patternHeight = r.patternHeight;
  } else if (patternType === 'speed_ramp') {
    const r = generateSpeedRamp(ctx);
    patternWidth = r.patternWidth;
    patternHeight = r.patternHeight;
  } else if (patternType === 'focus_ladder') {
    const r = generateFocusLadder(ctx);
    patternWidth = r.patternWidth;
    patternHeight = r.patternHeight;
  } else if (patternType === 'kerf_test') {
    const r = generateKerfTest(ctx, config.nominalThickness ?? 3.0);
    patternWidth = r.patternWidth;
    patternHeight = r.patternHeight;
  }

  const gcodeLines: string[] = [];
  if (machine.startGCode) gcodeLines.push(sanitizeGCodeBlock(machine.startGCode));
  else {
    gcodeLines.push('G21 ; Units mm');
    gcodeLines.push('G90 ; Absolute');
    gcodeLines.push(`G0 F${machine.travelSpeed} Z${machine.safeZ}`);
  }

  let currentZ = machine.safeZ;
  let currentFeed = 0;

  pathGroups.forEach((g: PathSegment) => {
    const p0 = g.points[0];
    gcodeLines.push(
      `G0 F${machine.travelSpeed} X${p0[0].toFixed(3)} Y${p0[1].toFixed(3)}${g.z !== currentZ ? ` Z${g.z}` : ''}`
    );
    currentZ = g.z;

    let onCmd = '';
    if (machine.laserMode === 'M3_M5') onCmd = `M3 S${g.power}`;
    else if (machine.laserMode === 'M106_M107') onCmd = `M106 S${g.power}`;
    else if (machine.laserMode === 'M3_M4_M5') onCmd = `M4 S${g.power}`;
    else onCmd = replacePower(machine.laserOn, g.power);

    gcodeLines.push(onCmd);

    for (let i = 1; i < g.points.length; i++) {
      const p = g.points[i];
      gcodeLines.push(
        `G1${g.speed !== currentFeed ? ` F${g.speed}` : ''} X${p[0].toFixed(3)} Y${p[1].toFixed(3)}`
      );
      currentFeed = g.speed;
    }

    let offCmd = '';
    if (machine.laserMode === 'M3_M5') offCmd = 'M5';
    else if (machine.laserMode === 'M106_M107') offCmd = 'M107';
    else if (machine.laserMode === 'M3_M4_M5') offCmd = 'M5';
    else offCmd = sanitizeGCodeLine(machine.laserOff);
    gcodeLines.push(offCmd);
  });

  if (machine.endGCode) gcodeLines.push(sanitizeGCodeBlock(machine.endGCode));
  else {
    gcodeLines.push(`G0 Z${machine.safeZ}`);
    gcodeLines.push('G0 X0 Y0');
  }

  const svgPaths: SvgPathElement[] = pathGroups.map((g: PathSegment) => {
    const d =
      `M ${g.points[0][0]} ${g.points[0][1]} ` +
      g.points
        .slice(1)
        .map((p: [number, number]) => `L ${p[0]} ${p[1]}`)
        .join(' ');
    let color = '#10b981';
    if (g.isLaserOn) {
      const ratio = g.power / machine.pwmMax;
      color =
        ratio < 0.3 ? '#93c5fd' : ratio < 0.6 ? '#3b82f6' : ratio < 0.85 ? '#f59e0b' : '#ef4444';
    }
    return {
      d,
      fill: 'none',
      stroke: color,
      strokeWidth: g.isLaserOn ? '0.5' : '0.1',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    };
  });

  return {
    gcode: gcodeLines.join('\n'),
    svgPaths,
    paths: pathGroups,
    width: patternWidth,
    height: patternHeight,
    offsetX: pos.x,
    offsetY: pos.y,
    deltaWarnings: deltaWarnings.length > 0 ? deltaWarnings : undefined,
  };
}
