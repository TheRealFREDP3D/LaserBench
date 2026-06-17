import { MachineProfile, MaterialProfile, PathElement, PatternType, Vector2D } from '../types';
import { renderTextPath } from './vectorFont';
import { DeltaKinematics, DEFAULT_DELTA_PARAMS } from './deltaKinematics';

export interface GeneratedData {
  gcode: string;
  svgPathData: string;
  paths: {
    points: [number, number][];
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
  }[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  deltaWarnings?: string[];
}

function getCenterOffset(machine: MachineProfile, patternWidth: number, patternHeight: number): { x: number; y: number } {
  const oX = machine.originX ?? 0;
  const oY = machine.originY ?? 0;

  if (machine.bedShape === 'circular') {
    return {
      x: oX - patternWidth / 2,
      y: oY - patternHeight / 2,
    };
  } else {
    const centerX = machine.bedWidth / 2 - oX;
    const centerY = machine.bedHeight / 2 - oY;
    return {
      x: centerX - patternWidth / 2,
      y: centerY - patternHeight / 2,
    };
  }
}

function createHatchedRectangle(
  x: number,
  y: number,
  w: number,
  h: number,
  hatchSpacing: number = 0.5
): [number, number][][] {
  const strokes: [number, number][][] = [];
  const linesCount = Math.floor(h / hatchSpacing);
  for (let i = 0; i <= linesCount; i++) {
    const currentY = y + i * hatchSpacing;
    if (i % 2 === 0) {
      strokes.push([[x, currentY], [x + w, currentY]]);
    } else {
      strokes.push([[x + w, currentY], [x, currentY]]);
    }
  }
  strokes.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
  return strokes;
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
  }
): GeneratedData {
  const powerMin = config.powerMin ?? Math.round(machine.pwmMax * 0.2);
  const powerMax = config.powerMax ?? machine.pwmMax;
  const speedMin = config.speedMin ?? 400;
  const speedMax = config.speedMax ?? 3000;
  const powerSteps = config.powerSteps ?? 5;
  const speedSteps = config.speedSteps ?? 5;
  const blockSize = config.blockSize ?? 12;

  const zMin = config.zMin ?? (machine.workZ - 3);
  const zMax = config.zMax ?? (machine.workZ + 3);
  const zSteps = config.zSteps ?? 5;

  const kerfValues = config.kerfValues ?? [0.10, 0.15, 0.20, 0.25];

  // Set up delta kinematics validator if applicable
  let deltaKin: DeltaKinematics | null = null;
  if (machine.isDelta) {
    deltaKin = new DeltaKinematics({
      deltaRadius: machine.deltaRadius ?? DEFAULT_DELTA_PARAMS.deltaRadius,
      deltaArmLength: machine.deltaArmLength ?? DEFAULT_DELTA_PARAMS.deltaArmLength,
      deltaRodLength: machine.deltaRodLength ?? DEFAULT_DELTA_PARAMS.deltaRodLength,
      deltaTowerAngleOffset: machine.deltaTowerAngleOffset ?? DEFAULT_DELTA_PARAMS.deltaTowerAngleOffset,
      printRadius: machine.deltaPrintRadius ?? DEFAULT_DELTA_PARAMS.printRadius,
    });
  }

  const deltaWarnings: string[] = [];

  const pathGroups: {
    points: [number, number][];
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
  }[] = [];

  function addSegment(points: [number, number][], power: number, speed: number, z: number, isLaserOn: boolean) {
    if (points.length < 2) return;

    // Delta reachability check
    if (deltaKin) {
      const unreachable = points.filter(([x, y]) => !deltaKin!.isReachable(x, y));
      if (unreachable.length > 0) {
        const warn = `Delta reachability: ${unreachable.length} point(s) outside print radius (e.g. [${unreachable[0][0].toFixed(1)}, ${unreachable[0][1].toFixed(1)}])`;
        if (!deltaWarnings.includes(warn)) {
          deltaWarnings.push(warn);
          console.warn('[LaserBench Delta]', warn);
        }
      }
    }

    pathGroups.push({ points, power, speed, z, isLaserOn });
  }

  const labelPower = Math.round(machine.pwmMax * 0.4);
  const labelSpeed = Math.min(2000, machine.travelSpeed / 2);

  let patternWidth = 100;
  let patternHeight = 100;

  if (patternType === 'power_ramp') {
    const swatchW = blockSize;
    const swatchH = blockSize;
    const spacing = Math.round(blockSize * 0.5);
    const steps = powerSteps;

    patternWidth = steps * swatchW + (steps - 1) * spacing;
    patternHeight = swatchH + 15;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    for (let i = 0; i < steps; i++) {
      const powerVal = steps > 1
        ? Math.round(powerMin + (i * (powerMax - powerMin)) / (steps - 1))
        : powerMax;

      const x = offset.x + i * (swatchW + spacing);
      const y = offset.y + 15;

      const rectPaths = createHatchedRectangle(x, y, swatchW, swatchH, 1.0);
      for (const stroke of rectPaths) {
        addSegment(stroke, powerVal, material.engrave.speed, machine.workZ, true);
      }

      const text = `P${powerVal}`;
      const textPaths = renderTextPath(text, x + 1, offset.y + 4, 5, 1.0);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    const titlePaths = renderTextPath(`POWER RAMP (F${material.engrave.speed})`, offset.x, offset.y + swatchH + 20, 5, 1.2);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }
    patternHeight += 12;

  } else if (patternType === 'speed_ramp') {
    const lineW = blockSize * 4;
    const steps = speedSteps;
    const lineSpacing = blockSize;

    patternWidth = lineW + 35;
    patternHeight = steps * lineSpacing + 20;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    for (let i = 0; i < steps; i++) {
      const speedVal = steps > 1
        ? Math.round(speedMin + (i * (speedMax - speedMin)) / (steps - 1))
        : speedMax;

      const lx = offset.x;
      const ly = offset.y + i * lineSpacing + 10;

      addSegment([[lx, ly], [lx + lineW, ly]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx, ly + 2], [lx + lineW, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx, ly], [lx, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx + lineW, ly], [lx + lineW, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);

      const text = `F${speedVal}`;
      const textPaths = renderTextPath(text, lx + lineW + 3, ly - 1, 5, 1.0);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    const titlePaths = renderTextPath(`SPEED RAMP (P${material.engrave.power})`, offset.x, offset.y + patternHeight - 5, 5, 1.2);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

  } else if (patternType === 'matrix') {
    const pSteps = powerSteps;
    const sSteps = speedSteps;

    const cellW = blockSize;
    const cellH = blockSize;
    const spacingW = Math.max(4, Math.round(blockSize * 0.65));
    const spacingH = Math.max(4, Math.round(blockSize * 0.65));

    const labelColumnW = 28;

    patternWidth = pSteps * cellW + (pSteps - 1) * spacingW + labelColumnW + 10;
    patternHeight = sSteps * cellH + (sSteps - 1) * spacingH + 33;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    const powerList: number[] = [];
    for (let c = 0; c < pSteps; c++) {
      powerList.push(pSteps > 1 ? Math.round(powerMin + (c * (powerMax - powerMin)) / (pSteps - 1)) : powerMax);
    }

    const speedList: number[] = [];
    for (let r = 0; r < sSteps; r++) {
      speedList.push(sSteps > 1 ? Math.round(speedMin + (r * (speedMax - speedMin)) / (sSteps - 1)) : speedMax);
    }

    const powerTitleColX = offset.x + labelColumnW + (pSteps * cellW + (pSteps - 1) * spacingW) / 2 - 15;
    const powerTitlePaths = renderTextPath("POWER", powerTitleColX, offset.y + patternHeight - 8, 5, 1.2);
    for (const stroke of powerTitlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

    for (let c = 0; c < pSteps; c++) {
      const pow = powerList[c];
      const cx = offset.x + labelColumnW + c * (cellW + spacingW);
      const numLabel = `P${pow}`;
      const textPaths = renderTextPath(numLabel, cx, offset.y + sSteps * (cellH + spacingH) + 2, 4, 0.8);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    const speedTitlePaths = renderTextPath("SPEED", offset.x, offset.y + patternHeight - 8, 5, 1.2);
    for (const stroke of speedTitlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

    for (let r = 0; r < sSteps; r++) {
      const speed = speedList[r];
      const ry = offset.y + r * (cellH + spacingH);

      const sText = `F${speed}`;
      const speedLabelPaths = renderTextPath(sText, offset.x, ry + cellH / 2 - 2, 4.5, 0.8);
      for (const stroke of speedLabelPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }

      for (let c = 0; c < pSteps; c++) {
        const powerVal = powerList[c];
        const cx = offset.x + labelColumnW + c * (cellW + spacingW);
        const cellPaths = createHatchedRectangle(cx, ry, cellW, cellH, 1.2);
        for (const stroke of cellPaths) {
          addSegment(stroke, powerVal, speed, machine.workZ, true);
        }
      }
    }

  } else if (patternType === 'focus_ladder') {
    const steps = zSteps;
    const lineH = Math.round(blockSize * 2.5);
    const spacing = Math.round(blockSize * 1.15);

    patternWidth = steps * 2 + (steps - 1) * spacing + 15;
    patternHeight = lineH + 20;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    for (let i = 0; i < steps; i++) {
      const zVal = steps > 1
        ? Number((zMin + (i * (zMax - zMin)) / (steps - 1)).toFixed(1))
        : Number(machine.workZ.toFixed(1));

      const cx = offset.x + i * spacing + 5;
      const cy = offset.y + 15;

      addSegment([[cx, cy], [cx, cy + lineH]], material.engrave.power, material.engrave.speed, zVal, true);
      addSegment([[cx - 3, cy + lineH], [cx + 3, cy + lineH]], material.engrave.power, material.engrave.speed, zVal, true);
      addSegment([[cx - 3, cy], [cx + 3, cy]], material.engrave.power, material.engrave.speed, zVal, true);
      addSegment([[cx - 2, cy + lineH / 2], [cx + 2, cy + lineH / 2]], material.engrave.power, material.engrave.speed, zVal, true);

      const zLabel = `Z${zVal >= 0 ? '+' : ''}${zVal}`;
      const textPaths = renderTextPath(zLabel, cx - 6, offset.y + 4, 4, 0.8);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    const titlePaths = renderTextPath(`FOCUS LADDER (P${material.engrave.power} F${material.engrave.speed})`, offset.x, offset.y + patternHeight - 5, 4.5, 1.0);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

  } else if (patternType === 'kerf_test') {
    const nominal = config.nominalThickness ?? material.thickness ?? 3.0;
    const offsets = kerfValues;

    const plateW = Math.round(blockSize * 6.25);
    const plateH = Math.round(blockSize * 2.1);
    const numSlots = offsets.length;

    patternWidth = plateW + 10;
    patternHeight = plateH + 20;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);
    const px = offset.x;
    const py = offset.y + 10;

    const outerFrame: [number, number][] = [
      [px, py],
      [px + plateW, py],
      [px + plateW, py + plateH],
      [px, py + plateH],
      [px, py]
    ];
    addSegment(outerFrame, material.cut.power, material.cut.speed, machine.workZ, true);

    const slotSpacing = plateW / (numSlots + 1);
    const slotH = 12;

    for (let i = 0; i < numSlots; i++) {
      const currentOffset = offsets[i];
      const slotWidth = nominal + currentOffset;
      const slotCenterX = px + (i + 1) * slotSpacing;
      const sx = slotCenterX - slotWidth / 2;
      const sy = py;

      const slotPath: [number, number][] = [
        [sx, sy],
        [sx, sy + slotH],
        [sx + slotWidth, sy + slotH],
        [sx + slotWidth, sy],
        [sx, sy]
      ];
      addSegment(slotPath, material.cut.power, material.cut.speed, machine.workZ, true);

      const signLabel = currentOffset >= 0 ? `+${currentOffset.toFixed(2)}` : `${currentOffset.toFixed(2)}`;
      const labelPaths = renderTextPath(signLabel, sx - 4, py + slotH + 2, 3.5, 0.7);
      for (const stroke of labelPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    const titleText = `KERF TEST (T:${nominal.toFixed(1)}MM)`;
    const kerfLabelPaths = renderTextPath(titleText, px + 3, py + plateH - 6, 4.0, 0.8);
    for (const stroke of kerfLabelPaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }
  }

  // G-code generation
  const gcodeLines: string[] = [];

  gcodeLines.push(`; LaserBench Calibration Suite Generated File`);
  gcodeLines.push(`; Pattern: ${patternType.toUpperCase()}`);
  gcodeLines.push(`; Machine Profile: ${machine.name}`);
  gcodeLines.push(`; Firmware: ${machine.firmware}`);
  if (machine.isDelta) {
    gcodeLines.push(`; Delta Kinematics: ENABLED (radius: ${machine.deltaPrintRadius ?? DEFAULT_DELTA_PARAMS.printRadius}mm)`);
  }
  gcodeLines.push(`; Material: ${material.name} (${material.thickness}mm)`);
  gcodeLines.push(`G21 ; Set units to millimeters`);
  gcodeLines.push(`G90 ; Absolute positioning`);
  gcodeLines.push(`G0 F${machine.travelSpeed} Z${machine.safeZ} ; Move to safe Z`);

  let currentX = 0;
  let currentY = 0;
  let currentZ = machine.safeZ;
  let isLaserOnState = false;
  let currentFeedrate = 0;

  pathGroups.forEach((group, index) => {
    const points = group.points;
    if (points.length === 0) return;

    const p0 = points[0];

    if (isLaserOnState) {
      gcodeLines.push(`${machine.laserOff} ; Disable laser before travel`);
      isLaserOnState = false;
    }

    let zMoveCmd = "";
    if (group.z !== currentZ) {
      currentZ = group.z;
      zMoveCmd = ` Z${currentZ}`;
    }

    gcodeLines.push(`G0 F${machine.travelSpeed} X${p0[0].toFixed(3)} Y${p0[1].toFixed(3)}${zMoveCmd} ; Rapid move to path start ; path:${index}`);
    currentX = p0[0];
    currentY = p0[1];

    const laserCmd = machine.laserOn.replace('{power}', group.power.toString());
    gcodeLines.push(`${laserCmd} ; Enable laser (S=${group.power}) ; path:${index}`);
    isLaserOnState = true;

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      let fCmd = "";
      if (group.speed !== currentFeedrate) {
        currentFeedrate = group.speed;
        fCmd = ` F${currentFeedrate}`;
      }
      gcodeLines.push(`G1${fCmd} X${p[0].toFixed(3)} Y${p[1].toFixed(3)} ; Scribing path ; path:${index}`);
      currentX = p[0];
      currentY = p[1];
    }
  });

  if (isLaserOnState) {
    gcodeLines.push(`${machine.laserOff} ; Disable laser at job end`);
  }

  gcodeLines.push(`G0 F${machine.travelSpeed} Z${machine.safeZ} ; Return to safe Z`);
  if (machine.bedShape === 'circular') {
    gcodeLines.push(`G0 X0 Y0 ; Centered parking`);
  } else {
    gcodeLines.push(`G0 X0 Y${machine.bedHeight.toFixed(1)} ; Return to back-left parking`);
  }
  gcodeLines.push(`M30 ; Program end`);

  const rawGCode = gcodeLines.join('\n');

  // SVG path generation
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  pathGroups.forEach(g => {
    g.points.forEach(p => {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    });
  });

  if (minX === Infinity) {
    minX = -50; maxX = 50; minY = -50; maxY = 50;
  }

  let svgPaths: string[] = [];
  pathGroups.forEach(g => {
    if (g.points.length < 1) return;
    const first = g.points[0];
    let d = `M ${first[0]} ${first[1]}`;
    for (let i = 1; i < g.points.length; i++) {
      const p = g.points[i];
      d += ` L ${p[0]} ${p[1]}`;
    }

    let strokeColor = "#10b981";
    let strokeWidth = 0.4;

    if (g.isLaserOn) {
      if (g.power < machine.pwmMax * 0.3) {
        strokeColor = "#93c5fd";
      } else if (g.power < machine.pwmMax * 0.6) {
        strokeColor = "#3b82f6";
      } else if (g.power < machine.pwmMax * 0.85) {
        strokeColor = "#f59e0b";
      } else {
        strokeColor = "#ef4444";
      }
      strokeWidth = 0.5 + (g.power / machine.pwmMax) * 0.5;
    } else {
      strokeColor = "rgba(120, 120, 120, 0.15)";
      strokeWidth = 0.15;
    }

    svgPaths.push(`<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`);
  });

  const svgInner = svgPaths.join('\n');

  return {
    gcode: rawGCode,
    svgPathData: svgInner,
    paths: pathGroups,
    width: maxX - minX,
    height: maxY - minY,
    offsetX: minX,
    offsetY: minY,
    deltaWarnings: deltaWarnings.length > 0 ? deltaWarnings : undefined,
  };
}
