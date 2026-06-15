import { MachineProfile, MaterialProfile, PathElement, PatternType, Vector2D } from '../types';
import { renderTextPath } from './vectorFont';

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
}

/**
 * Centering helper
 */
function getCenterOffset(machine: MachineProfile, patternWidth: number, patternHeight: number): { x: number; y: number } {
  const oX = machine.originX ?? 0;
  const oY = machine.originY ?? 0;

  if (machine.bedShape === 'circular') {
    // origin is (0,0) at center of circular bed
    // Custom originX/originY shift the target center coordinate on circular bed
    return {
      x: oX - patternWidth / 2,
      y: oY - patternHeight / 2,
    };
  } else {
    // origin is (0,0) at bottom-left of rectangular bed by default
    // If coordinate origin is placed at (oX, oY) relative to bottom-left,
    // then bed center coordinate = (bedWidth / 2 - oX, bedHeight / 2 - oY).
    const centerX = machine.bedWidth / 2 - oX;
    const centerY = machine.bedHeight / 2 - oY;
    return {
      x: centerX - patternWidth / 2,
      y: centerY - patternHeight / 2,
    };
  }
}

/**
 * Creates horizontal filled rectangle via raster hatching
 */
function createHatchedRectangle(
  x: number,
  y: number,
  w: number,
  h: number,
  hatchSpacing: number = 0.5
): [number, number][][] {
  const strokes: [number, number][][] = [];
  // horizontal hatch lines
  const linesCount = Math.floor(h / hatchSpacing);
  for (let i = 0; i <= linesCount; i++) {
    const currentY = y + i * hatchSpacing;
    if (i % 2 === 0) {
      strokes.push([[x, currentY], [x + w, currentY]]);
    } else {
      strokes.push([[x + w, currentY], [x, currentY]]);
    }
  }
  // add a border around the rectangle to keep it neat
  strokes.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
  return strokes;
}

/**
 * Create a slot comb or kerf slats test
 */
function createKerfSlats(
  x: number,
  y: number,
  slatWidth: number,
  slatHeight: number,
  count: number,
  nominalSpacing: number
): [number, number][][] {
  const strokes: [number, number][][] = [];
  // Outlying frame
  const totalWidth = count * slatWidth + (count - 1) * nominalSpacing;
  strokes.push([
    [x, y],
    [x + totalWidth, y],
    [x + totalWidth, y + slatHeight],
    [x, y + slatHeight],
    [x, y]
  ]);

  // Slat cut lines
  for (let i = 1; i < count; i++) {
    // vertical cuts separating slats
    const cutX = x + i * slatWidth + (i - 1) * nominalSpacing;
    strokes.push([[cutX, y], [cutX, y + slatHeight]]);
  }
  return strokes;
}

/**
 * Core pathway generator for each pattern type
 */
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
    // kerf options
    nominalThickness?: number;
    kerfValues?: number[]; // e.g. [0.10, 0.15, 0.20, 0.25]
    // z steps for focus ladder
    zMin?: number;
    zMax?: number;
    zSteps?: number;
  }
): GeneratedData {
  // Extract configuration or defaults
  const powerMin = config.powerMin ?? Math.round(machine.pwmMax * 0.2); // 20%
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

  // We will build a list of continuous laser paths.
  // Move elements have isLaserOn = false
  // Cut elements have isLaserOn = true
  // Each path segment contains array of 2D points, power, speed, Z, and laser flag.
  const pathGroups: {
    points: [number, number][];
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
  }[] = [];

  // Helper to add paths
  function addSegment(points: [number, number][], power: number, speed: number, z: number, isLaserOn: boolean) {
    if (points.length < 2) return;
    pathGroups.push({ points, power, speed, z, isLaserOn });
  }

  // Label settings
  const labelPower = Math.round(machine.pwmMax * 0.4); // safe legible power
  const labelSpeed = Math.min(2000, machine.travelSpeed / 2); // safe speed for writing text

  let patternWidth = 100;
  let patternHeight = 100;

  // Render the paths based on pattern type
  if (patternType === 'power_ramp') {
    // Power Ramp: 
    // Draw a horizontal row of rectangular hatched swatches or stripes with increasing power.
    // Labeled beneath e.g. "P50", "P100", ...
    const swatchW = blockSize;
    const swatchH = blockSize;
    const spacing = Math.round(blockSize * 0.5);
    const steps = powerSteps;
    
    patternWidth = steps * swatchW + (steps - 1) * spacing;
    patternHeight = swatchH + 15; // extra space for text below

    // Grid center offset
    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    // Calculate levels
    for (let i = 0; i < steps; i++) {
       const powerVal = steps > 1 
        ? Math.round(powerMin + (i * (powerMax - powerMin)) / (steps - 1)) 
        : powerMax;
      
      const x = offset.x + i * (swatchW + spacing);
      const y = offset.y + 15; // leave bottom for labels
      
      // Draw the swatch (hatched)
      const rectPaths = createHatchedRectangle(x, y, swatchW, swatchH, 1.0);
      for (const stroke of rectPaths) {
        addSegment(stroke, powerVal, material.engrave.speed, machine.workZ, true);
      }

      // Draw text label: "Pxxx" or "xx%"
      const pct = Math.round((powerVal / machine.pwmMax) * 100);
      const text = `P${powerVal}`;
      const textPaths = renderTextPath(text, x + 1, offset.y + 4, 5, 1.0);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    // Add a title or framing
    const titlePaths = renderTextPath(`POWER RAMP (F${material.engrave.speed})`, offset.x, offset.y + swatchH + 20, 5, 1.2);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }
    patternHeight += 12;

  } else if (patternType === 'speed_ramp') {
    // Speed Ramp:
    // A vertical stacked series of horizontal segments.
    // Each line segment drawn at a different speed with a constant power level.
    // Labeled beside e.g. "F400", "F800", "F1600"
    const lineW = blockSize * 4;
    const steps = speedSteps;
    const lineSpacing = blockSize;
    
    patternWidth = lineW + 35; // extra space for label text on right
    patternHeight = steps * lineSpacing + 20;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    for (let i = 0; i < steps; i++) {
      const speedVal = steps > 1 
        ? Math.round(speedMin + (i * (speedMax - speedMin)) / (steps - 1)) 
        : speedMax;
      
      const lx = offset.x;
      const ly = offset.y + i * lineSpacing + 10;

      // Draw horizontal calibration mark
      // Let's draw double lines or a simple thin outline rectangle to give a clear burn swatch
      addSegment([[lx, ly], [lx + lineW, ly]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx, ly + 2], [lx + lineW, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx, ly], [lx, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);
      addSegment([[lx + lineW, ly], [lx + lineW, ly + 2]], material.engrave.power, speedVal, machine.workZ, true);

      // Label: "Fxxxx"
      const text = `F${speedVal}`;
      const textPaths = renderTextPath(text, lx + lineW + 3, ly - 1, 5, 1.0);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    // Draw pattern details title
    const titlePaths = renderTextPath(`SPEED RAMP (P${material.engrave.power})`, offset.x, offset.y + patternHeight - 5, 5, 1.2);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

  } else if (patternType === 'matrix') {
    // Power-Speed Matrix:
    // Columns are Powers: 5 columns from powerMin to powerMax
    // Rows are Speeds: 5 rows from speedMin to speedMax
    const pSteps = powerSteps;
    const sSteps = speedSteps;
    
    const cellW = blockSize;
    const cellH = blockSize;
    const spacingW = Math.max(4, Math.round(blockSize * 0.65));
    const spacingH = Math.max(4, Math.round(blockSize * 0.65));
    
    // Label offsets: speed labels on the left (25mm), power labels at the top (15mm)
    const labelColumnW = 28;
    const labelRowH = 18;

    patternWidth = pSteps * cellW + (pSteps - 1) * spacingW + labelColumnW + 10;
    patternHeight = sSteps * cellH + (sSteps - 1) * spacingH + labelRowH + 15;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);

    // Calculate actual steps lists
    const powerList: number[] = [];
    for (let c = 0; c < pSteps; c++) {
      powerList.push(pSteps > 1 ? Math.round(powerMin + (c * (powerMax - powerMin)) / (pSteps - 1)) : powerMax);
    }

    const speedList: number[] = [];
    for (let r = 0; r < sSteps; r++) {
      speedList.push(sSteps > 1 ? Math.round(speedMin + (r * (speedMax - speedMin)) / (sSteps - 1)) : speedMax);
    }

    // 1. Draw Columns Header (Power values)
    const powerTitleColX = offset.x + labelColumnW + (pSteps * cellW + (pSteps - 1) * spacingW) / 2 - 15;
    const powerTitlePaths = renderTextPath("POWER", powerTitleColX, offset.y + patternHeight - 8, 5, 1.2);
    for (const stroke of powerTitlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

    for (let c = 0; c < pSteps; c++) {
      const pow = powerList[c];
      const cx = offset.x + labelColumnW + c * (cellW + spacingW);
      const text = `${Math.round((pow / machine.pwmMax) * 100)}%`; // display as percentage
      const numLabel = `P${pow}`;
      // draw Pxxx vertically or small
      const textPaths = renderTextPath(numLabel, cx, offset.y + sSteps * (cellH + spacingH) + 2, 4, 0.8);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    // 2. Draw Speed Row Title (vertically or at left header)
    const speedTitlePaths = renderTextPath("SPEED", offset.x, offset.y + patternHeight - 8, 5, 1.2);
    for (const stroke of speedTitlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

    // 3. Draw Grid: Cell power = col power, speed = row speed
    for (let r = 0; r < sSteps; r++) {
      const speed = speedList[r];
      const ry = offset.y + r * (cellH + spacingH);

      // Speed labels on Left: "Fxxxx"
      const sText = `F${speed}`;
      const speedLabelPaths = renderTextPath(sText, offset.x, ry + cellH / 2 - 2, 4.5, 0.8);
      for (const stroke of speedLabelPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }

      // Inside cells
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
    // Focus Ladder:
    // A horizontal series of vertical lines.
    // Each vertical line drawn at a DIFFERENT Z coordinate!
    // Labeled beneath with Z height.
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

      // Draw Calibration geometry: A thin crosshair or vertical marking lines
      // Let's draw a vertical line and a center circle or diagonal crosses
      const linePath: [number, number][] = [[cx, cy], [cx, cy + lineH]];
      const tickPathTop: [number, number][] = [[cx - 3, cy + lineH], [cx + 3, cy + lineH]];
      const tickPathBot: [number, number][] = [[cx - 3, cy], [cx + 3, cy]];
      const horizontalLine: [number, number][] = [[cx - 2, cy + lineH/2], [cx + 2, cy + lineH/2]];

      // Draw them under the specific Z value!
      addSegment(linePath, material.engrave.power, material.engrave.speed, zVal, true);
      addSegment(tickPathTop, material.engrave.power, material.engrave.speed, zVal, true);
      addSegment(tickPathBot, material.engrave.power, material.engrave.speed, zVal, true);
      addSegment(horizontalLine, material.engrave.power, material.engrave.speed, zVal, true);

      // Text label for Z height: e.g. "Z-40.5" or "Z-38.0"
      const zLabel = `Z${zVal >= 0 ? '+' : ''}${zVal}`;
      const textPaths = renderTextPath(zLabel, cx - 6, offset.y + 4, 4, 0.8);
      for (const stroke of textPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true); // labels are written at workZ
      }
    }

    // Write title
    const titlePaths = renderTextPath(`FOCUS LADDER (P${material.engrave.power} F${material.engrave.speed})`, offset.x, offset.y + patternHeight - 5, 4.5, 1.0);
    for (const stroke of titlePaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }

  } else if (patternType === 'kerf_test') {
    // Kerf cutting slots. 
    // This engraves a row of cutouts that act as slots/combs of width values (e.g. key spacings)
    // Slat thickness is designed to test offsets: e.g. 0.10, 0.15, 0.20, 0.25 offset values
    // To make this easily measurable without complicated setups:
    // Let's draw nested test squares with precise dimensions, say a 10mm pocket and tabs that are 10mm minus kerf spacing,
    // Or let's create a robust "Kerf Combs" with slots of labeled nominal width settings!
    // Example: slots of width nominalSpacing - offset, so they can test which width fits a 3.0mm wood sheet tightly.
    // Nominal sheet thickness can be supplied, e.g. 3.0mm.
    const nominal = config.nominalThickness ?? material.thickness ?? 3.0;
    const offsets = kerfValues; // e.g. [0.10, 0.15, 0.20, 0.25]
    
    // We will draw a rectangular plate with multiple vertical slot cuts.
    // Each cut has width = nominal + offset (or nominal - offset).
    // Let's draw 4 slots, formatted nicely with slots side-by-side.
    // Plates size 60mm x 25mm.
    const plateW = Math.round(blockSize * 6.25);
    const plateH = Math.round(blockSize * 2.1);
    const numSlots = offsets.length;
    
    patternWidth = plateW + 10;
    patternHeight = plateH + 20;

    const offset = getCenterOffset(machine, patternWidth, patternHeight);
    const px = offset.x;
    const py = offset.y + 10;

    // Draw the main plate outer frame using material "CUT" settings
    const outerFrame: [number, number][] = [
      [px, py],
      [px + plateW, py],
      [px + plateW, py + plateH],
      [px, py + plateH],
      [px, py]
    ];
    addSegment(outerFrame, material.cut.power, material.cut.speed, machine.workZ, true);

    // Let's carve slots of size "nominal + offset" into the bottom of the plate
    // A slot of width W, height 12mm starting at the bottom edge.
    const slotSpacing = plateW / (numSlots + 1);
    const slotH = 12;

    for (let i = 0; i < numSlots; i++) {
      const currentOffset = offsets[i];
      const slotWidth = nominal + currentOffset;
      const slotCenterX = px + (i + 1) * slotSpacing;
      
      const sx = slotCenterX - slotWidth / 2;
      const sy = py;

      // Cut slot path (a U-shape: up, over, down, then horizontal cut along the plate edge to drop the slot out)
      const slotPath: [number, number][] = [
        [sx, sy],
        [sx, sy + slotH],
        [sx + slotWidth, sy + slotH],
        [sx + slotWidth, sy],
        [sx, sy] // close it to fully drop the slot piece
      ];
      // cut with the dynamic cut power
      addSegment(slotPath, material.cut.power, material.cut.speed, machine.workZ, true);

      // Label this slot with the offset value: e.g. "+.15" or "+.20"
      const signLabel = currentOffset >= 0 ? `+${currentOffset.toFixed(2)}` : `${currentOffset.toFixed(2)}`;
      const labelPaths = renderTextPath(signLabel, sx - 4, py + slotH + 2, 3.5, 0.7);
      for (const stroke of labelPaths) {
        addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
      }
    }

    // Plate Title Label (Nominal thickness e.g. "KERF 3.0MM")
    const titleText = `KERF TEST (T:${nominal.toFixed(1)}MM)`;
    const labelPaths = renderTextPath(titleText, px + 3, py + plateH - 6, 4.0, 0.8);
    for (const stroke of labelPaths) {
      addSegment(stroke, labelPower, labelSpeed, machine.workZ, true);
    }
  }

  // Generate G-code lines array
  const gcodeLines: string[] = [];

  // Setup header
  gcodeLines.push(`; LaserBench Calibration Suite Generated File`);
  gcodeLines.push(`; Pattern: ${patternType.toUpperCase()}`);
  gcodeLines.push(`; Machine Profile: ${machine.name}`);
  gcodeLines.push(`; Firmware: ${machine.firmware}`);
  gcodeLines.push(`; Material: ${material.name} (${material.thickness}mm)`);
  gcodeLines.push(`G21 ; Set units to millimeters`);
  gcodeLines.push(`G90 ; Absolute positioning`);
  
  // Z-axis movement
  gcodeLines.push(`G0 F${machine.travelSpeed} Z${machine.safeZ} ; Move to safe Z`);

  // Track coordinates and state to optimize moves and coordinate safety limits
  let currentX = 0;
  let currentY = 0;
  let currentZ = machine.safeZ;
  let isLaserOnState = false;
  let currentFeedrate = 0;

  // Render path entities
  pathGroups.forEach((group, index) => {
    const points = group.points;
    if (points.length === 0) return;

    const p0 = points[0];

    // 1. Move to start point of path (laser OFF)
    if (isLaserOnState) {
      gcodeLines.push(`${machine.laserOff} ; Disable laser before travel`);
      isLaserOnState = false;
    }

    // travel move to target Z first if needed
    let zMoveCmd = "";
    if (group.z !== currentZ) {
      currentZ = group.z;
      zMoveCmd = ` Z${currentZ}`;
    }

    gcodeLines.push(`G0 F${machine.travelSpeed} X${p0[0].toFixed(3)} Y${p0[1].toFixed(3)}${zMoveCmd} ; Rapid move to path start ; path:${index}`);
    
    currentX = p0[0];
    currentY = p0[1];

    // 2. Turn Laser On
    const laserCmd = machine.laserOn.replace('{power}', group.power.toString());
    gcodeLines.push(`${laserCmd} ; Enable laser (S=${group.power}) ; path:${index}`);
    isLaserOnState = true;

    // 3. Draw lines in path
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

  // Turn laser off at end
  if (isLaserOnState) {
    gcodeLines.push(`${machine.laserOff} ; Disable laser at job end`);
  }

  // Return to safe Z and park
  gcodeLines.push(`G0 F${machine.travelSpeed} Z${machine.safeZ} ; Return to safe Z`);
  if (machine.bedShape === 'circular') {
    gcodeLines.push(`G0 X0 Y0 ; Centered parking`);
  } else {
    gcodeLines.push(`G0 X0 Y${machine.bedHeight.toFixed(1)} ; Return to back-left parking`);
  }
  gcodeLines.push(`M30 ; Program end`);

  const rawGCode = gcodeLines.join('\n');

  // Generate SVG path code for visualizer
  // The coordinate system needs to map bed width/height to viewPort box.
  // We want to scale coordinates so they can draw nicely in an SVG box.
  // We'll compute minX, maxX, minY, maxY to center the drawing in the preview viewport.
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

  // fallbacks if empty
  if (minX === Infinity) {
    minX = -50; maxX = 50; minY = -50; maxY = 50;
  }

  // To draw a clear SVG, we can convert all pathGroups into drawing paths.
  // Each pathGroup will be translated, keeping the same relative layout
  let svgPaths: string[] = [];
  pathGroups.forEach(g => {
    if (g.points.length < 1) return;
    const first = g.points[0];
    let d = `M ${first[0]} ${first[1]}`;
    for (let i = 1; i < g.points.length; i++) {
      const p = g.points[i];
      d += ` L ${p[0]} ${p[1]}`;
    }
    // we color paths according to power or function
    let strokeColor = "#10b981"; // default green
    let strokeWidth = 0.4;
    
    if (g.isLaserOn) {
      if (g.power < machine.pwmMax * 0.3) {
        strokeColor = "#93c5fd"; // light blue
      } else if (g.power < machine.pwmMax * 0.6) {
        strokeColor = "#3b82f6"; // bright indigo/blue
      } else if (g.power < machine.pwmMax * 0.85) {
        strokeColor = "#f59e0b"; // yellow/orange
      } else {
        strokeColor = "#ef4444"; // fire red
      }
      strokeWidth = 0.5 + (g.power / machine.pwmMax) * 0.5; // thick curves for hot power levels
    } else {
      // travel lines
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
  };
}
