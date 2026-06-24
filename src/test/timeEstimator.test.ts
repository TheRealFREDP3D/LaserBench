import { describe, it, expect } from 'vitest';
import { estimateToolpathTime } from '../lib/timeEstimator';
import { MachineProfile, PathSegment } from '../types';

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
  travelSpeed: 6000,
  bedShape: 'rectangular',
  bedWidth: 200,
  bedHeight: 200,
  baudRate: 115200,
  acceleration: 1000,
};

describe('timeEstimator', () => {
  it('estimates simple path time', () => {
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
  });
});
