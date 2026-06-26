import { describe, it, expect } from 'vitest';
import { estimateToolpathTime, formatEstimatedTime } from '../lib/timeEstimator';
import type { MachineProfile, PathSegment } from '../types';

const mockMachine: MachineProfile = {
  id: 'm1',
  name: 'M1',
  firmware: 'grbl',
  laserMode: 'M3_M5',
  laserOn: 'M3 S{power}',
  laserOff: 'M5',
  pwmMax: 1000,
  safeZ: 10,
  workZ: 0,
  zSecure: 10,
  zFocused: 0,
  travelSpeed: 6000,
  bedShape: 'rectangular',
  bedWidth: 200,
  bedHeight: 200,
  baudRate: 115200,
  acceleration: 1000,
};

describe('estimateToolpathTime', () => {
  it('returns 0 for empty paths', () => {
    expect(estimateToolpathTime([], mockMachine)).toBe(0);
  });

  it('returns 0 for null/undefined paths', () => {
    expect(estimateToolpathTime(null as never, mockMachine)).toBe(0);
  });

  it('estimates time for a simple 100mm line at 6000mm/min', () => {
    const paths: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const time = estimateToolpathTime(paths, mockMachine);
    expect(time).toBeGreaterThan(0);
    expect(time).toBeLessThan(10);
  });

  it('longer paths take more time', () => {
    const short: PathSegment[] = [
      {
        points: [
          [0, 0],
          [50, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const long: PathSegment[] = [
      {
        points: [
          [0, 0],
          [200, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    expect(estimateToolpathTime(long, mockMachine)).toBeGreaterThan(
      estimateToolpathTime(short, mockMachine)
    );
  });

  it('slower speed takes more time', () => {
    const fast: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const slow: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 0],
        ],
        speed: 3000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    expect(estimateToolpathTime(slow, mockMachine)).toBeGreaterThan(
      estimateToolpathTime(fast, mockMachine)
    );
  });

  it('adds overhead for laser state transitions', () => {
    const oneTransition: PathSegment[] = [
      {
        points: [
          [0, 0],
          [10, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const twoTransitions: PathSegment[] = [
      {
        points: [
          [0, 0],
          [10, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
      {
        points: [
          [20, 0],
          [30, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: false,
      },
    ];
    expect(estimateToolpathTime(twoTransitions, mockMachine)).toBeGreaterThan(
      estimateToolpathTime(oneTransition, mockMachine)
    );
  });

  it('handles segments with < 2 points (skipped)', () => {
    const paths: PathSegment[] = [
      {
        points: [[0, 0]],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    expect(estimateToolpathTime(paths, mockMachine)).toBe(0);
  });

  it('handles zero-distance segments', () => {
    const paths: PathSegment[] = [
      {
        points: [
          [5, 5],
          [5, 5],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const time = estimateToolpathTime(paths, mockMachine);
    expect(time).toBeLessThanOrEqual(0.1);
  });

  it('uses machine travel speed for non-laser segments', () => {
    const paths: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 0],
        ],
        speed: 0,
        power: 0,
        z: 0,
        isLaserOn: false,
      },
    ];
    const time = estimateToolpathTime(paths, mockMachine);
    expect(time).toBeGreaterThan(0);
  });

  it('handles diagonal paths (euclidean distance)', () => {
    const paths: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 100],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const time = estimateToolpathTime(paths, mockMachine);
    expect(time).toBeGreaterThan(0);
  });

  it('handles machine without acceleration (defaults to 1000)', () => {
    const machineNoAccel = { ...mockMachine, acceleration: undefined };
    const paths: PathSegment[] = [
      {
        points: [
          [0, 0],
          [100, 0],
        ],
        speed: 6000,
        power: 500,
        z: 0,
        isLaserOn: true,
      },
    ];
    const time = estimateToolpathTime(paths, machineNoAccel);
    expect(time).toBeGreaterThan(0);
  });
});

describe('formatEstimatedTime', () => {
  it('formats 0 seconds', () => {
    expect(formatEstimatedTime(0)).toBe('0s');
  });

  it('formats negative as 0s', () => {
    expect(formatEstimatedTime(-10)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatEstimatedTime(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatEstimatedTime(125)).toBe('2m 5s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatEstimatedTime(3723)).toBe('1h 2m 3s');
  });

  it('formats exactly 60 seconds as 1m', () => {
    expect(formatEstimatedTime(60)).toBe('1m');
  });

  it('formats exactly 3600 seconds as 1h 0m', () => {
    expect(formatEstimatedTime(3600)).toBe('1h 0m');
  });

  it('formats large durations', () => {
    expect(formatEstimatedTime(54000)).toBe('15h 0m');
  });
});
