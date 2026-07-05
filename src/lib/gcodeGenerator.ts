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

const POWER_RAMP_LENGTH_MM = 80;
const POWER_RAMP_GRADIENT_STEPS = 40;
const POWER_RAMP_INSET_MM = 0.5;

const SPEED_RAMP_LINE_LENGTH_MM = 60;
const SPEED_RAMP_LINE_GAP_MM = 5;

const FOCUS_LADDER_LINE_LENGTH_MM = 40;
const FOCUS_LADDER_LINE_GAP_MM = 8;

const MATRIX_BLOCK_GAP_MM = 4;

const KERF_SLOT_WIDTH_MM = 15;
const KERF_SLOT_HEIGHT_MM = 20;
const KERF_SLOT_GAP_MM = 10;

const LABEL_TEXT_SCALE = 0.5;
const LABEL_SPACING_SCALE = 0.5;
const TITLE_TEXT_SCALE = 0.6;
const TITLE_SPACING_SCALE = 0.6;
const SMALL_LABEL_TEXT_SCALE = 0.7;
const SMALL_LABEL_SPACING_SCALE = 0.7;
const LABEL_OFFSET_MM = 2;
const TITLE_OFFSET_MM = 5;

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
    isLaserOn: boolean,
    postSegmentGCode?: string
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
  patternScale: number;
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
    patternScale,
    textSize,
    textLetterSpacing,
    labelPower,
    labelSpeed,
    machine,
    material,
  } = ctx;

  const gap = MATRIX_BLOCK_GAP_MM * patternScale;
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
      textSize * SMALL_LABEL_TEXT_SCALE,
      textLetterSpacing * SMALL_LABEL_SPACING_SCALE
    );
    speedLabelPaths.forEach(stroke => {
      if (stroke.length > 0) {
        addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
      }
    });


    for (let p = 0; p < powerSteps; p++) {
      const power =
        powerSteps > 1 ? powerMin + (powerMax - powerMin) * (p / (powerSteps - 1)) : powerMin;
      const py = startY + p * (blockSize + gap);

      const stepover = 0.2 * patternScale;
      const lines = Math.ceil(blockSize / stepover);
      const rasterPoints: [number, number][] = [];
      for (let i = 0; i <= lines; i++) {
        const y = py + i * stepover;
        if (i % 2 === 0) {
          rasterPoints.push([px, y], [px + blockSize, y]);
        } else {
          rasterPoints.push([px + blockSize, y], [px, y]);
        }
      }
      addSegment(
        rasterPoints,
        Math.round(power),
        Math.round(speed),
        machine.zFocused + material.thickness,
        true
      );

      if (s === 0) {
        const pLabel = Math.round(power).toString();
        const pLabelPaths = renderTextPath(
          pLabel,
          px - gap - pLabel.length * textSize * 0.5,
          py + blockSize / 2 - textSize / 2,
          textSize * SMALL_LABEL_TEXT_SCALE,
          textLetterSpacing * SMALL_LABEL_SPACING_SCALE
        );
pLabelPaths.forEach(stroke => {
  if (stroke.length > 0) {
    addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
  }
});
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
    patternScale,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    material,
  } = ctx;
  const rampLen = POWER_RAMP_LENGTH_MM * patternScale;
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
    machine.zFocused + material.thickness,
    true
  );

  const inset = POWER_RAMP_INSET_MM * patternScale;
  for (let i = 0; i < POWER_RAMP_GRADIENT_STEPS; i++) {
    const x1 = startX + (i / POWER_RAMP_GRADIENT_STEPS) * rampLen;
    const x2 = startX + ((i + 1) / POWER_RAMP_GRADIENT_STEPS) * rampLen;
    const p = powerMin + (i / POWER_RAMP_GRADIENT_STEPS) * (powerMax - powerMin);
    addSegment(
      [
        [x1, startY + inset],
        [x2, startY + inset],
        [x2, startY + blockSize - inset],
        [x1, startY + blockSize - inset],
        [x1, startY + inset],
      ],
      Math.round(p),
      speedMin,
      machine.zFocused + material.thickness,
      true
    );
  }

  const labelOffset = LABEL_OFFSET_MM * patternScale;
  const label = `PWR RAMP: ${Math.round(powerMin)}-${Math.round(powerMax)} F${Math.round(speedMin)}`;
  const lp = renderTextPath(
    label,
    startX - label.length * textSize * 0.4,
    startY + blockSize + LABEL_OFFSET_MM * patternScale,
    textSize * LABEL_TEXT_SCALE,
    textLetterSpacing * LABEL_SPACING_SCALE
  );
  lp.forEach(stroke => {
    if (stroke.length > 0) {
      addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
    }
  });

  return { patternWidth: rampLen, patternHeight: blockSize + 10 * patternScale };
}

function generateSpeedRamp(ctx: PatternContext) {
  const {
    addSegment,
    powerMin,
    speedMin,
    speedMax,
    speedSteps,
    patternScale,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    material,
  } = ctx;
  const lineLen = SPEED_RAMP_LINE_LENGTH_MM * patternScale;
  const lineGap = SPEED_RAMP_LINE_GAP_MM * patternScale;
  const totalH = speedSteps * lineGap;
  const startX = -lineLen / 2;
  const startY = -totalH / 2;

  for (let i = 0; i < speedSteps; i++) {
    const speed =
      speedSteps > 1 ? speedMin + (speedMax - speedMin) * (i / (speedSteps - 1)) : speedMin;
    const y = startY + i * lineGap;
    addSegment(
      [
        [startX, y],
        [startX + lineLen, y],
      ],
      powerMin,
      Math.round(speed),
      machine.zFocused + material.thickness,
      true
    );

    const label = Math.round(speed).toString();
    const lp = renderTextPath(
      label,
      startX + lineLen + LABEL_OFFSET_MM * patternScale,
      y - textSize / 2,
      textSize * LABEL_TEXT_SCALE,
      textLetterSpacing * LABEL_SPACING_SCALE
    );
    lp.forEach(stroke => {
      if (stroke.length > 0) {
        addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
      }
    });
  }

  const title = `SPEED RAMP (S${Math.round(powerMin)})`;
  const tp = renderTextPath(
    title,
    startX,
    startY - TITLE_OFFSET_MM * patternScale,
    textSize * TITLE_TEXT_SCALE,
    textLetterSpacing * TITLE_SPACING_SCALE
  );
  tp.forEach(stroke => {
    if (stroke.length > 0) {
      addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
    }
  });

  return { patternWidth: lineLen + 20 * patternScale, patternHeight: totalH + 10 * patternScale };
}

function generateFocusLadder(ctx: PatternContext) {
  const {
    addSegment,
    zMin,
    zMax,
    zSteps,
    patternScale,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    material,
  } = ctx;
  const engravePower = material.engrave.power;
  const engraveSpeed = material.engrave.speed;
  const lineLen = FOCUS_LADDER_LINE_LENGTH_MM * patternScale;
  const lineGap = FOCUS_LADDER_LINE_GAP_MM * patternScale;
  const totalH = zSteps * lineGap;
  const startX = -lineLen / 2;
  const startY = -totalH / 2;
  const workingZ = machine.zFocused + material.thickness;

  for (let i = 0; i < zSteps; i++) {
    const z = zSteps > 1 ? zMin + (zMax - zMin) * (i / (zSteps - 1)) : zMin;
    const y = startY + i * lineGap;

    addSegment(
      [
        [startX, y],
        [startX + lineLen, y],
      ],
      engravePower,
      engraveSpeed,
      z,
      true
    );

    const label = `Z:${z.toFixed(2)}`;
    const lp = renderTextPath(
      label,
      startX + lineLen + LABEL_OFFSET_MM * patternScale,
      y - textSize / 2,
      textSize * LABEL_TEXT_SCALE,
      textLetterSpacing * LABEL_SPACING_SCALE
    );
    lp.forEach(stroke => {
      if (stroke.length > 0) {
        addSegment(stroke as [number, number][], labelPower, labelSpeed, z, true);
      }
    });
  }

  const title = `FOCUS LADDER (P:${engravePower} S:${engraveSpeed})`;
  const tp = renderTextPath(
    title,
    startX,
    startY - TITLE_OFFSET_MM * patternScale - 1,
    textSize * TITLE_TEXT_SCALE,
    textLetterSpacing * TITLE_SPACING_SCALE
  );
  tp.forEach(stroke => {
    if (stroke.length > 0) {
      addSegment(stroke as [number, number][], labelPower, labelSpeed, workingZ, true);
    }
  });

  return { patternWidth: lineLen + 30 * patternScale, patternHeight: totalH + 15 * patternScale };
}

function generateKerfTest(ctx: PatternContext, nominal: number) {
  const {
    addSegment,
    kerfValues,
    patternScale,
    machine,
    labelPower,
    labelSpeed,
    textSize,
    textLetterSpacing,
    material,
  } = ctx;
  const slotW = KERF_SLOT_WIDTH_MM * patternScale;
  const slotH = KERF_SLOT_HEIGHT_MM * patternScale;
  const slotGap = KERF_SLOT_GAP_MM * patternScale;
  const totalW = kerfValues.length * (slotW + slotGap);
  const startX = -totalW / 2;
  const startY = -slotH / 2;

  kerfValues.forEach((offset, i) => {
    const px = startX + i * (slotW + slotGap);
    const actualW = (nominal + offset) * patternScale;

    const pts: [number, number][] = [
      [px, startY + slotH],
      [px, startY],
      [px + actualW, startY],
      [px + actualW, startY + slotH],
    ];
    addSegment(
      pts,
      material.cut.power,
      material.cut.speed,
      machine.zFocused + material.thickness,
      true
    );

    const label = offset >= 0 ? `+${offset.toFixed(2)}` : offset.toFixed(2);
    const lp = renderTextPath(
      label,
      px + actualW / 2 - (label.length * textSize * 0.4) / 2,
      startY + slotH + LABEL_OFFSET_MM * patternScale,
      textSize * LABEL_TEXT_SCALE,
      textLetterSpacing * LABEL_SPACING_SCALE
    );
    lp.forEach(stroke => {
      if (stroke.length > 0) {
        addSegment(stroke as [number, number][], labelPower, labelSpeed, machine.zFocused + material.thickness, true);
      }
    });
  });

  return { patternWidth: totalW, patternHeight: slotH + 10 * patternScale };
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
    textSize?: number;
    nominalThickness?: number;
    kerfValues?: number[];
    zMin?: number;
    zMax?: number;
    zSteps?: number;
    patternPosition?: { x: number; y: number };
  }
): GeneratedData {
  const powerMin = Math.min(config.powerMin ?? 50, config.powerMax ?? machine.pwmMax);
  const powerMax = Math.max(config.powerMin ?? 50, config.powerMax ?? machine.pwmMax);
  const speedMin = Math.min(config.speedMin ?? 500, config.speedMax ?? 3000);
  const speedMax = Math.max(config.speedMin ?? 500, config.speedMax ?? 3000);
  const powerSteps = config.powerSteps ?? 5;
  const speedSteps = config.speedSteps ?? 5;
  const blockSize = Math.max(1, config.blockSize ?? 10);
  const zMin = config.zMin ?? 0;
  const zMax = config.zMax ?? 5;
  const zSteps = config.zSteps ?? 5;
  const kerfValues = config.kerfValues ?? [0.1, 0.15, 0.2, 0.25];
  const pos = config.patternPosition ?? { x: 0, y: 0 };

  const textSize = Math.max(2, config.textSize ?? blockSize * 0.4);
  const textLetterSpacing = textSize * 0.3;
  const patternScale = blockSize / 10;

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

  const deltaWarnings = new Set<string>();
  const pathGroups: PathSegment[] = [];

  function addSegment(
    points: [number, number][],
    power: number,
    speed: number,
    z: number,
    isLaserOn: boolean,
    postSegmentGCode?: string
  ) {
    const movedPoints = points.map(([x, y]) => [x + pos.x, y + pos.y] as [number, number]);

    if (deltaKin) {
      const unreachable = movedPoints.filter(([x, y]) => !deltaKin!.isReachable(x, y));
      if (unreachable.length > 0) {
        const warn = `Delta: Point [${unreachable[0][0].toFixed(1)}, ${unreachable[0][1].toFixed(1)}] out of bounds`;
        deltaWarnings.add(warn);
      }
    }
    pathGroups.push({ points: movedPoints, power, speed, z, isLaserOn, postSegmentGCode });
  }

const labelPower = Math.round(material.cut.power);
const labelSpeed = material.cut.speed;

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
    patternScale,
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
    gcodeLines.push('G21');
    gcodeLines.push('M106 S0');
  }

  gcodeLines.push('G91');

  const laserOffCmd = sanitizeGCodeLine(machine.laserOff) || 'M5';

  let currentZ = machine.zSecure;
  let currentFeed = 0;
  let prevX = 0;
  let prevY = 0;
  pathGroups.forEach((g: PathSegment, idx: number) => {
    const p0 = g.points[0];
    const zChanged = g.z !== currentZ;
    const deltaX0 = p0[0] - prevX;
    const deltaY0 = p0[1] - prevY;
    const deltaZ0 = g.z - currentZ;

    gcodeLines.push(laserOffCmd);

    gcodeLines.push(
      `G0 F${machine.travelSpeed} X${deltaX0.toFixed(3)} Y${deltaY0.toFixed(3)}${zChanged ? ` Z${deltaZ0.toFixed(3)}` : ''}`
    );
    prevX = p0[0];
    prevY = p0[1];
    currentZ = g.z;

    let onCmd = '';
    if (machine.laserMode === 'M3_M5') onCmd = `M3 S${g.power}`;
    else if (machine.laserMode === 'M106_M107') onCmd = `M106 S${g.power}`;
    else if (machine.laserMode === 'M3_M4_M5') onCmd = `M4 S${g.power}`;
    gcodeLines.push(onCmd);

    for (let i = 1; i < g.points.length; i++) {
      const p = g.points[i];
      const firstCut = i === 1;
      const deltaX = p[0] - prevX;
      const deltaY = p[1] - prevY;
      gcodeLines.push(
        `G1${g.speed !== currentFeed || firstCut ? ` F${g.speed}` : ''} X${deltaX.toFixed(3)} Y${deltaY.toFixed(3)}`
      );
      prevX = p[0];
      prevY = p[1];
      currentFeed = g.speed;
    }
  });

  gcodeLines.push(laserOffCmd);
  gcodeLines.push('G28');
  gcodeLines.push('M9');
  if (machine.endGCode) gcodeLines.push(sanitizeGCodeBlock(machine.endGCode));

  const svgPaths: SvgPathElement[] = pathGroups.map((g: PathSegment) => {
    const d =
      `M ${g.points[0][0]} ${g.points[0][1]} ` +
      g.points
        .slice(1)
        .map((p: [number, number]) => `L ${p[0]} ${p[1]}`)
        .join(' ');
    let color = '#10b981';
    if (g.isLaserOn) {
      const ratio = machine.pwmMax > 0 ? g.power / machine.pwmMax : 0;
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
    deltaWarnings: deltaWarnings.size > 0 ? [...deltaWarnings] : undefined,
  };
}
