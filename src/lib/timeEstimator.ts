import { MachineProfile } from '../types';

interface PathSegment {
  points: [number, number][];
  speed: number;
  isLaserOn: boolean;
}

/**
 * Estimates the total laser burn and transit time in seconds based on
 * generated paths, machine feed limits, and acceleration profiles.
 */
export function estimateToolpathTime(paths: PathSegment[], machine: MachineProfile): number {
  if (!paths || paths.length === 0) return 0;

  let totalSeconds = 0;

  // Dynamic acceleration from machine profile (default: 1000 mm/s²)
  const acceleration = machine.acceleration ?? 1000;
  const a = Math.max(10, acceleration); // Safeguard against zero or negative values

  // Travel speed from machine profile (mm/min)
  const travelSpeed = machine.travelSpeed ?? 4000;

  let lastLaserState = false;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    if (!path.points || path.points.length < 2) continue;

    // Convert speeds from mm/min to mm/s
    const feedRateMin = path.isLaserOn ? path.speed : travelSpeed;
    const v = Math.max(1, feedRateMin) / 60; // Target velocity in mm/s

    // Traverse the vertices in this path segment
    for (let j = 0; j < path.points.length - 1; j++) {
      const p0 = path.points[j];
      const p1 = path.points[j + 1];
      const distance = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (distance === 0) continue;

      // Distance required to accelerate from 0 to target speed and back to 0
      const dAccel = (v * v) / a;

      let segmentTime = 0;
      if (distance >= dAccel) {
        // Full trapezoid: accelerate 0→v, cruise, decelerate v→0
        // Expanded: 2*(v/a) + (distance - dAccel)/v
        // Simplified: v/a + distance/v  (accel + decel time collapse to v/a)
        segmentTime = v / a + distance / v;
      } else {
        // Triangle profile: cannot reach full speed, accel then immediately decel
        segmentTime = 2 * Math.sqrt(distance / a);
      }

      totalSeconds += segmentTime;
    }

    // Capture small delays for switching command states (approx 0.1s for GG laser enable commands)
    if (path.isLaserOn !== lastLaserState) {
      totalSeconds += 0.08;
      lastLaserState = path.isLaserOn;
    }
  }

  return totalSeconds;
}

/**
 * Formats seconds into a human-readable duration (e.g. "1h 14m 23s" or "3m 4s" or "45s")
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hrs > 0) {
    parts.push(`${hrs}h`);
  }
  if (mins > 0 || hrs > 0) {
    parts.push(`${mins}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }

  return parts.join(' ');
}
