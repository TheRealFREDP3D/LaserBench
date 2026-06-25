import { PathSegment, SvgPathElement } from '../types';

interface ParsedCommand {
  type: 'G' | 'M' | 'T' | 'S' | 'F' | 'N' | 'O' | 'comment' | 'unknown';
  code?: number;
  params: Record<string, number>;
  raw: string;
}

function parseLine(line: string): ParsedCommand {
  const trimmed = line.split(';')[0].trim();
  if (!trimmed) return { type: 'comment', params: {}, raw: line };

  const match = trimmed.match(/^([GMTSONF])(\d+)?\s*(.*)?$/i);
  if (!match) return { type: 'unknown', params: {}, raw: line };

  const type = match[1].toUpperCase();
  const code = match[2] ? parseInt(match[2], 10) : undefined;
  const paramStr = match[3] || '';
  const params: Record<string, number> = {};

  const paramRegex = /([A-Z])(-?[\d.]+)/gi;
  let pm: RegExpExecArray | null;
  while ((pm = paramRegex.exec(paramStr)) !== null) {
    params[pm[1].toUpperCase()] = parseFloat(pm[2]);
  }

  return { type: type as ParsedCommand['type'], code, params, raw: line };
}

function inferPowerFromCommand(cmd: ParsedCommand, currentPower: number): number {
  if (cmd.type === 'M' && (cmd.code === 3 || cmd.code === 4)) {
    if (cmd.params.S !== undefined) return cmd.params.S;
  }
  if (cmd.type === 'M' && cmd.code === 106) {
    if (cmd.params.S !== undefined) return cmd.params.S;
  }
  return currentPower;
}

function inferLaserOn(cmd: ParsedCommand): boolean | null {
  if (cmd.type === 'M' && (cmd.code === 3 || cmd.code === 4)) {
    if (cmd.params.S !== undefined && cmd.params.S > 0) return true;
    if (cmd.params.S === undefined) return true;
  }
  if (cmd.type === 'M' && cmd.code === 106) {
    if (cmd.params.S !== undefined && cmd.params.S > 0) return true;
    if (cmd.params.S === undefined) return true;
  }
  if (cmd.type === 'M' && (cmd.code === 5 || cmd.code === 107)) return false;
  return null;
}

export interface ParseResult {
  paths: PathSegment[];
  svgPaths: SvgPathElement[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function parseGCode(gcode: string, pwmMax: number = 1000): ParseResult {
  const lines = gcode.split('\n');
  const paths: PathSegment[] = [];
  let currentPower = 0;
  let currentSpeed = 1000;
  let currentZ = 0;
  let laserOn = false;
  let relativeMode = false;

  let segX = 0;
  let segY = 0;
  let segPoints: [number, number][] = [];
  let segPower = 0;
  let segSpeed = 1000;
  let segLaserOn = false;

  const flushSegment = () => {
    if (segPoints.length >= 2) {
      paths.push({
        points: [...segPoints],
        power: segPower,
        speed: segSpeed,
        z: currentZ,
        isLaserOn: segLaserOn,
      });
    }
    segPoints = [];
  };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const updateBounds = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  for (const rawLine of lines) {
    const cmd = parseLine(rawLine);
    if (cmd.type === 'comment' || cmd.type === 'unknown' || cmd.type === 'N' || cmd.type === 'O') {
      continue;
    }

    const laserState = inferLaserOn(cmd);
    if (laserState !== null) {
      if (laserOn !== laserState) {
        flushSegment();
        laserOn = laserState;
      }
    }

    const newPower = inferPowerFromCommand(cmd, currentPower);
    if (newPower !== currentPower) {
      if (laserOn) {
        flushSegment();
      }
      currentPower = newPower;
    }

    if (cmd.params.F !== undefined) {
      currentSpeed = cmd.params.F;
    }

    let newX = segX;
    let newY = segY;
    let moved = false;

    if (cmd.type === 'G') {
      if (cmd.code === 90) {
        relativeMode = false;
      } else if (cmd.code === 91) {
        relativeMode = true;
      } else if (cmd.code === 0 || cmd.code === 1) {
        if (cmd.params.X !== undefined) {
          newX = relativeMode ? segX + cmd.params.X : cmd.params.X;
          moved = true;
        }
        if (cmd.params.Y !== undefined) {
          newY = relativeMode ? segY + cmd.params.Y : cmd.params.Y;
          moved = true;
        }
        if (cmd.params.Z !== undefined) {
          if (segPoints.length >= 2) flushSegment();
          currentZ = relativeMode ? currentZ + cmd.params.Z : cmd.params.Z;
        }
      } else if (cmd.code === 28) {
        flushSegment();
        newX = 0;
        newY = 0;
        moved = true;
      } else if (cmd.code === 92) {
        if (cmd.params.X !== undefined) newX = cmd.params.X;
        if (cmd.params.Y !== undefined) newY = cmd.params.Y;
        moved = true;
      }
    }

    if (moved) {
      if (segPoints.length === 0) {
        segPoints.push([segX, segY]);
        segPower = laserOn ? currentPower : 0;
        segSpeed = currentSpeed;
        segLaserOn = laserOn;
      }
      segPoints.push([newX, newY]);
      updateBounds(newX, newY);
      segX = newX;
      segY = newY;

      if (segPoints.length > 1000) {
        flushSegment();
      }
    }
  }

  flushSegment();

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  const svgPaths: SvgPathElement[] = paths.map((g) => {
    const d =
      `M ${g.points[0][0]} ${g.points[0][1]} ` +
      g.points
        .slice(1)
        .map((p) => `L ${p[0]} ${p[1]}`)
        .join(' ');

    let color = '#10b981';
    if (g.isLaserOn) {
      const ratio = g.power / pwmMax;
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
    paths,
    svgPaths,
    bounds: { minX, minY, maxX, maxY },
  };
}
