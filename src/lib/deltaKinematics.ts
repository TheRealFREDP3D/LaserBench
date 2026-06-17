/**
 * Delta Inverse Kinematics for LaserBench
 * Validates Cartesian coordinates against delta printer reachability constraints.
 * Note: Marlin/GRBL firmware handles actual IK; this is for pre-flight validation.
 */

export interface DeltaParams {
  deltaRadius: number;       // Horizontal distance from center to tower (mm)
  deltaArmLength: number;    // Diagonal rod length (mm)
  deltaRodLength: number;    // Effective rod length (mm)
  deltaTowerAngleOffset: number; // Tower angular offset in degrees (default 0)
  printRadius: number;       // Max printable radius from center (mm)
}

export const DEFAULT_DELTA_PARAMS: DeltaParams = {
  deltaRadius: 105.6,
  deltaArmLength: 217.0,
  deltaRodLength: 217.0,
  deltaTowerAngleOffset: 0,
  printRadius: 85,
};

export class DeltaKinematics {
  private params: DeltaParams;

  // Tower positions (A=front-left, B=front-right, C=back)
  private towerA: [number, number];
  private towerB: [number, number];
  private towerC: [number, number];

  constructor(params: Partial<DeltaParams> = {}) {
    this.params = { ...DEFAULT_DELTA_PARAMS, ...params };
    const offset = (this.params.deltaTowerAngleOffset * Math.PI) / 180;
    const r = this.params.deltaRadius;

    this.towerA = [
      r * Math.cos((210 * Math.PI) / 180 + offset),
      r * Math.sin((210 * Math.PI) / 180 + offset),
    ];
    this.towerB = [
      r * Math.cos((330 * Math.PI) / 180 + offset),
      r * Math.sin((330 * Math.PI) / 180 + offset),
    ];
    this.towerC = [
      r * Math.cos((90 * Math.PI) / 180 + offset),
      r * Math.sin((90 * Math.PI) / 180 + offset),
    ];
  }

  /**
   * Checks if a Cartesian XY position is within the reachable print radius.
   */
  isReachable(x: number, y: number): boolean {
    const distFromCenter = Math.hypot(x, y);
    return distFromCenter <= this.params.printRadius;
  }

  /**
   * Returns max printable radius.
   */
  getMaxRadius(): number {
    return this.params.printRadius;
  }

  /**
   * Computes tower carriage heights for a given XYZ coordinate.
   * Returns null if the point is unreachable.
   */
  inverseKinematics(x: number, y: number, z: number): { a: number; b: number; c: number } | null {
    if (!this.isReachable(x, y)) return null;

    const L = this.params.deltaRodLength;

    const calcTower = (tower: [number, number]): number | null => {
      const dx = x - tower[0];
      const dy = y - tower[1];
      const distSq = dx * dx + dy * dy;
      const rodSq = L * L - distSq;
      if (rodSq < 0) return null;
      return z + Math.sqrt(rodSq);
    };

    const a = calcTower(this.towerA);
    const b = calcTower(this.towerB);
    const c = calcTower(this.towerC);

    if (a === null || b === null || c === null) return null;
    return { a, b, c };
  }
}